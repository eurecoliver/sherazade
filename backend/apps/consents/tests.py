"""
Test per ConsensoFotografico: property stato, GDPR.
"""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.children.models import Bambino, Famiglia
from apps.config.models import PermessoRuolo
from .models import ConsensoFotografico


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────
_counter = 0

def make_user(email, role, password='TestPass123!'):
    username = email.replace('@', '_').replace('.', '_')
    return User.objects.create_user(
        username=username, email=email, password=password, role=role,
    )


def make_bambino(cf_suffix='01'):
    return Bambino.objects.create(
        nome='Test', cognome='Bambino',
        data_nascita='2021-01-01',
        data_iscrizione='2023-09-01',
        attivo=True,
        codice_fiscale=f'TSTBMB{cf_suffix}X00X000X000X',
    )


def auth_header(user):
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


def grant(role, risorsa, azione):
    PermessoRuolo.objects.get_or_create(
        ruolo=role, risorsa=risorsa, azione=azione,
        defaults={'consentito': True},
    )
    PermessoRuolo.objects.filter(ruolo=role, risorsa=risorsa, azione=azione).update(consentito=True)


# ─────────────────────────────────────────────────────────────────
# Test property stato (logica GDPR, nessuna DB query extra)
# ─────────────────────────────────────────────────────────────────
class ConsensoStatoTest(TestCase):

    def setUp(self):
        self.genitore1 = make_user('g1@test.it', 'genitore')
        self.genitore2 = make_user('g2@test.it', 'genitore')
        self.bambino_solo = make_bambino('01')   # solo genitore 1
        self.bambino_duo = make_bambino('02')    # entrambi i genitori

        Famiglia.objects.create(bambino=self.bambino_solo, genitore1=self.genitore1)
        Famiglia.objects.create(
            bambino=self.bambino_duo,
            genitore1=self.genitore1,
            genitore2=self.genitore2,
        )

    def _crea_consenso(self, bambino, g1=False, g2=None, revocato=False):
        return ConsensoFotografico(
            bambino=bambino,
            finalita=ConsensoFotografico.Finalita.USO_INTERNO,
            consenso_genitore1=g1,
            consenso_genitore2=g2,
            revocato=revocato,
        )

    def test_stato_completo_un_genitore(self):
        """Un solo genitore → basta consenso_genitore1=True per 'completo'."""
        c = self._crea_consenso(self.bambino_solo, g1=True)
        self.assertEqual(c.stato, 'completo')

    def test_stato_nessuno_un_genitore(self):
        c = self._crea_consenso(self.bambino_solo, g1=False)
        self.assertEqual(c.stato, 'nessuno')

    def test_stato_completo_due_genitori(self):
        c = self._crea_consenso(self.bambino_duo, g1=True, g2=True)
        self.assertEqual(c.stato, 'completo')

    def test_stato_parziale_due_genitori_solo_g1(self):
        c = self._crea_consenso(self.bambino_duo, g1=True, g2=False)
        self.assertEqual(c.stato, 'parziale')

    def test_stato_parziale_due_genitori_solo_g2(self):
        c = self._crea_consenso(self.bambino_duo, g1=False, g2=True)
        self.assertEqual(c.stato, 'parziale')

    def test_stato_nessuno_due_genitori(self):
        c = self._crea_consenso(self.bambino_duo, g1=False, g2=False)
        self.assertEqual(c.stato, 'nessuno')

    def test_stato_revocato_prevale(self):
        """Revocato prevale su qualsiasi valore di consenso."""
        c = self._crea_consenso(self.bambino_solo, g1=True, revocato=True)
        self.assertEqual(c.stato, 'revocato')

    def test_stato_non_fotografabile_prevale_su_tutto(self):
        """non_fotografabile=True → stato='non_fotografabile' sempre."""
        self.bambino_solo.non_fotografabile = True
        # Non serve salvare — la property legge solo l'attributo
        c = self._crea_consenso(self.bambino_solo, g1=True)
        self.assertEqual(c.stato, 'non_fotografabile')

    def test_unique_together_bambino_finalita(self):
        """Non possono esistere due consensi per lo stesso bambino+finalità."""
        from django.db import IntegrityError
        ConsensoFotografico.objects.create(
            bambino=self.bambino_solo,
            finalita=ConsensoFotografico.Finalita.NEWSLETTER,
        )
        with self.assertRaises(IntegrityError):
            ConsensoFotografico.objects.create(
                bambino=self.bambino_solo,
                finalita=ConsensoFotografico.Finalita.NEWSLETTER,
            )


# ─────────────────────────────────────────────────────────────────
# Test API Consensi
# ─────────────────────────────────────────────────────────────────
class ConsensiAPITest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@test.it', 'admin')
        self.genitore = make_user('gen@test.it', 'genitore')
        self.insegnante = make_user('ins@test.it', 'insegnante')
        grant('insegnante', 'consensi', 'leggi')
        grant('genitore', 'consensi', 'leggi')
        grant('genitore', 'consensi', 'scrivi')

        self.bambino = make_bambino('03')
        Famiglia.objects.create(bambino=self.bambino, genitore1=self.genitore)

        # Consenso per il bambino
        self.consenso = ConsensoFotografico.objects.create(
            bambino=self.bambino,
            finalita=ConsensoFotografico.Finalita.USO_INTERNO,
            consenso_genitore1=False,
        )

    def test_lista_consensi_admin(self):
        resp = self.client.get('/api/v1/consensi/', **auth_header(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_lista_consensi_insegnante_read_only(self):
        """Insegnante può leggere i consensi."""
        resp = self.client.get('/api/v1/consensi/', **auth_header(self.insegnante))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_lista_consensi_non_autenticato(self):
        resp = self.client.get('/api/v1/consensi/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_genitore_dai_consenso(self):
        """Il genitore può dare il consenso per il proprio figlio."""
        url = f'/api/v1/consensi/{self.consenso.pk}/dai_consenso/'
        resp = self.client.post(url, **auth_header(self.genitore))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.consenso.refresh_from_db()
        self.assertTrue(self.consenso.consenso_genitore1)

    def test_genitore_revoca_consenso(self):
        """Il genitore può revocare il consenso."""
        self.consenso.consenso_genitore1 = True
        self.consenso.save()
        url = f'/api/v1/consensi/{self.consenso.pk}/revoca_consenso/'
        resp = self.client.post(url, **auth_header(self.genitore))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.consenso.refresh_from_db()
        self.assertTrue(self.consenso.revocato)
