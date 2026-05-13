"""
Test per anagrafica bambini: CRUD, permessi per ruolo, filtri.
"""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.config.models import PermessoRuolo, Gruppo
from .models import Bambino, Famiglia


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────
_counter = 0

def make_user(email, role, password='TestPass123!'):
    username = email.replace('@', '_').replace('.', '_')
    return User.objects.create_user(
        username=username, email=email, password=password, role=role,
        first_name='Test', last_name=role.capitalize(),
    )


def make_bambino(nome='Luca', cognome='Rossi', cf_suffix='01', gruppo=None):
    return Bambino.objects.create(
        nome=nome, cognome=cognome,
        data_nascita='2021-01-01',
        data_iscrizione='2023-09-01',
        attivo=True,
        codice_fiscale=f'TSTBMB{cf_suffix}X00X000X',
        gruppo=gruppo,
    )


def auth_header(user):
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


def grant(role, risorsa, azione):
    from django.db import IntegrityError, transaction
    try:
        with transaction.atomic():
            PermessoRuolo.objects.create(ruolo=role, risorsa=risorsa, azione=azione, consentito=True)
    except IntegrityError:
        PermessoRuolo.objects.filter(ruolo=role, risorsa=risorsa, azione=azione).update(consentito=True)


# ─────────────────────────────────────────────────────────────────
# Test modello Bambino
# ─────────────────────────────────────────────────────────────────
class BambinoModelTest(TestCase):

    def test_str(self):
        b = make_bambino(nome='Luca', cognome='Rossi', cf_suffix='02')
        self.assertEqual(str(b), 'Rossi Luca')

    def test_sezione_property_senza_gruppo(self):
        b = make_bambino(cf_suffix='03')
        self.assertEqual(b.sezione, '')

    def test_sezione_property_con_gruppo(self):
        g = Gruppo.objects.create(nome='Gialli', colore='#F1C40F')
        b = make_bambino(cf_suffix='04', gruppo=g)
        self.assertEqual(b.sezione, 'Gialli')

    def test_alias_disabilitato_di_default(self):
        b = make_bambino(cf_suffix='05')
        self.assertFalse(b.alias_attivo)
        self.assertEqual(b.alias_nome, '')

    def test_non_fotografabile_disabilitato_di_default(self):
        b = make_bambino(cf_suffix='06')
        self.assertFalse(b.non_fotografabile)

    def test_codice_fiscale_univoco(self):
        from django.db import IntegrityError
        make_bambino(cf_suffix='07')
        with self.assertRaises(IntegrityError):
            # Stesso CF → IntegrityError
            Bambino.objects.create(
                nome='Clone', cognome='Rossi',
                data_nascita='2021-01-01',
                data_iscrizione='2023-09-01',
                attivo=True,
                codice_fiscale='TSTBMB07X00X000X',
            )


# ─────────────────────────────────────────────────────────────────
# Test API bambini — permessi per ruolo
# ─────────────────────────────────────────────────────────────────
class BambinoPermessiTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@test.it', 'admin')
        self.direttrice = make_user('dir@test.it', 'direttrice')
        self.insegnante = make_user('ins@test.it', 'insegnante')
        self.genitore = make_user('gen@test.it', 'genitore')
        self.cuoca = make_user('cuoca@test.it', 'cuoca')

        # Permessi per insegnante e cuoca (in produzione sono seedati dalla migration)
        for r in ('insegnante', 'coordinatrice', 'direttrice', 'cuoca', 'genitore'):
            grant(r, 'bambini', 'leggi')
        for r in ('insegnante', 'coordinatrice', 'direttrice'):
            grant(r, 'bambini', 'scrivi')
            grant(r, 'bambini', 'elimina')

        self.bambino = make_bambino(cf_suffix='10')
        Famiglia.objects.create(bambino=self.bambino, genitore1=self.genitore)

    def test_admin_vede_tutti_bambini(self):
        resp = self.client.get('/api/v1/bambini/', **auth_header(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [b['id'] for b in (resp.data if isinstance(resp.data, list) else resp.data.get('results', resp.data))]
        self.assertIn(self.bambino.pk, ids)

    def test_genitore_vede_solo_propri_figli(self):
        # Bambino di un altro genitore
        altro_genitore = make_user('altrogenitore@test.it', 'genitore')
        altro_bambino = make_bambino(nome='Altro', cognome='Bambino', cf_suffix='11')
        Famiglia.objects.create(bambino=altro_bambino, genitore1=altro_genitore)

        resp = self.client.get('/api/v1/bambini/', **auth_header(self.genitore))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data if isinstance(resp.data, list) else resp.data.get('results', [])
        ids = [b['id'] for b in data]
        self.assertIn(self.bambino.pk, ids)
        self.assertNotIn(altro_bambino.pk, ids)

    def test_non_autenticato_vietato(self):
        resp = self.client.get('/api/v1/bambini/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_crea_bambino(self):
        payload = {
            'nome': 'Nuovo', 'cognome': 'Bambino',
            'data_nascita': '2022-03-15',
            'data_iscrizione': '2024-09-01',
            'codice_fiscale': 'NUOVO00X00X000X000X',
            'attivo': True,
        }
        resp = self.client.post('/api/v1/bambini/', payload, **auth_header(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['nome'], 'Nuovo')

    def test_genitore_non_puo_creare_bambino(self):
        """Il genitore non ha il permesso di creare bambini."""
        payload = {
            'nome': 'Tentativo', 'cognome': 'Genitore',
            'data_nascita': '2022-01-01',
            'data_iscrizione': '2024-09-01',
            'codice_fiscale': 'TENTXX0X00X000X000X',
        }
        resp = self.client.post('/api/v1/bambini/', payload, **auth_header(self.genitore))
        self.assertIn(resp.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED])

    def test_insegnante_vede_bambini(self):
        resp = self.client.get('/api/v1/bambini/', **auth_header(self.insegnante))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────
# Test modello Famiglia
# ─────────────────────────────────────────────────────────────────
class FamigliaModelTest(TestCase):

    def test_crea_famiglia_un_genitore(self):
        g1 = make_user('famg1@test.it', 'genitore')
        b = make_bambino(cf_suffix='20')
        f = Famiglia.objects.create(bambino=b, genitore1=g1)
        self.assertIsNone(f.genitore2)
        self.assertEqual(str(f), f'Famiglia di {b}')

    def test_crea_famiglia_due_genitori(self):
        g1 = make_user('fam2g1@test.it', 'genitore')
        g2 = make_user('fam2g2@test.it', 'genitore')
        b = make_bambino(cf_suffix='21')
        f = Famiglia.objects.create(bambino=b, genitore1=g1, genitore2=g2)
        self.assertIsNotNone(f.genitore2)

    def test_famiglia_one_to_one_bambino(self):
        """Non si possono creare due famiglie per lo stesso bambino."""
        from django.db import IntegrityError
        g1 = make_user('fam3g1@test.it', 'genitore')
        g2 = make_user('fam3g2@test.it', 'genitore')
        b = make_bambino(cf_suffix='22')
        Famiglia.objects.create(bambino=b, genitore1=g1)
        with self.assertRaises(IntegrityError):
            Famiglia.objects.create(bambino=b, genitore1=g2)
