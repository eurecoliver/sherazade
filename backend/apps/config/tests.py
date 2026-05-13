"""
Test per i permessi granulari: check_permesso(), PermessoRuolo, Ruolo.
"""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from .models import PermessoRuolo, Ruolo, Gruppo
from .permessi import check_permesso


# ─────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────
def make_user(email, role, password='TestPass123!'):
    username = email.replace('@', '_').replace('.', '_')
    return User.objects.create_user(
        username=username, email=email, password=password, role=role,
    )


def auth_header(user):
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


def grant(role, risorsa, azione, consentito=True):
    """Crea o aggiorna un permesso, gestendo record già presenti da migration."""
    from django.db import IntegrityError, transaction
    try:
        with transaction.atomic():
            PermessoRuolo.objects.create(ruolo=role, risorsa=risorsa, azione=azione, consentito=consentito)
    except IntegrityError:
        PermessoRuolo.objects.filter(ruolo=role, risorsa=risorsa, azione=azione).update(consentito=consentito)


# ─────────────────────────────────────────────────────────────────
# Test check_permesso()
# ─────────────────────────────────────────────────────────────────
class CheckPermessoTest(TestCase):

    def test_admin_bypassa_sempre(self):
        """Admin ha sempre accesso a qualsiasi risorsa/azione."""
        admin = make_user('admin@test.it', 'admin')
        self.assertTrue(check_permesso(admin, 'bambini', 'leggi'))
        self.assertTrue(check_permesso(admin, 'bambini', 'scrivi'))
        self.assertTrue(check_permesso(admin, 'bambini', 'elimina'))
        self.assertTrue(check_permesso(admin, 'utenti', 'elimina'))
        self.assertTrue(check_permesso(admin, 'audit', 'leggi'))

    def test_utente_non_autenticato(self):
        """Utente None o non autenticato → sempre False."""
        self.assertFalse(check_permesso(None, 'bambini', 'leggi'))

    def test_ruolo_senza_permessi_ha_accesso_negato(self):
        """Un ruolo senza record PermessoRuolo → False."""
        user = make_user('ins@test.it', 'insegnante')
        # Nessun PermessoRuolo creato → nessun accesso
        self.assertFalse(check_permesso(user, 'bambini', 'elimina'))

    def test_ruolo_con_permesso_ha_accesso(self):
        """Se PermessoRuolo.consentito=True → True."""
        user = make_user('coord@test.it', 'coordinatrice')
        grant('coordinatrice', 'bambini', 'leggi', consentito=True)
        self.assertTrue(check_permesso(user, 'bambini', 'leggi'))

    def test_ruolo_con_permesso_negato(self):
        """Se PermessoRuolo.consentito=False → False."""
        user = make_user('cuoca@test.it', 'cuoca')
        grant('cuoca', 'diario', 'leggi', consentito=False)
        self.assertFalse(check_permesso(user, 'diario', 'leggi'))

    def test_permesso_su_risorsa_diversa_non_vale(self):
        """Un ruolo custom con solo bambini/leggi non ha accesso a diario/leggi."""
        user = make_user('custom@test.it', 'custom_only_bambini')
        grant('custom_only_bambini', 'bambini', 'leggi', consentito=True)
        # custom_only_bambini non ha mai avuto diario/leggi nelle migration
        self.assertFalse(check_permesso(user, 'diario', 'leggi'))

    def test_ruolo_custom(self):
        """Funziona anche con ruoli custom (non tra quelli standard)."""
        user = make_user('custom@test.it', 'custom_xyz')
        PermessoRuolo.objects.create(
            ruolo='custom_xyz', risorsa='presenze', azione='leggi', consentito=True,
        )
        self.assertTrue(check_permesso(user, 'presenze', 'leggi'))
        self.assertFalse(check_permesso(user, 'presenze', 'scrivi'))


# ─────────────────────────────────────────────────────────────────
# Test modello Gruppo
# ─────────────────────────────────────────────────────────────────
class GruppoModelTest(TestCase):

    def test_crea_gruppo(self):
        g = Gruppo.objects.create(nome='Gialli', colore='#F1C40F', ordine=1)
        self.assertEqual(str(g), 'Gialli')
        self.assertTrue(g.attivo)

    def test_ordinamento_per_ordine(self):
        Gruppo.objects.create(nome='Terzo', colore='#aaa', ordine=3)
        Gruppo.objects.create(nome='Primo', colore='#bbb', ordine=1)
        Gruppo.objects.create(nome='Secondo', colore='#ccc', ordine=2)
        gruppi = list(Gruppo.objects.values_list('nome', flat=True))
        self.assertEqual(gruppi, ['Primo', 'Secondo', 'Terzo'])

    def test_nome_univoco(self):
        from django.db import IntegrityError
        Gruppo.objects.create(nome='Blu', colore='#00f', ordine=0)
        with self.assertRaises(IntegrityError):
            Gruppo.objects.create(nome='Blu', colore='#00f', ordine=0)


# ─────────────────────────────────────────────────────────────────
# Test modello Ruolo
# ─────────────────────────────────────────────────────────────────
class RuoloModelTest(TestCase):

    def test_crea_ruolo(self):
        r = Ruolo.objects.create(codice='test_ruolo', nome='Ruolo di test')
        self.assertEqual(str(r), 'Ruolo di test')
        self.assertFalse(r.sistema)

    def test_codice_univoco(self):
        from django.db import IntegrityError
        Ruolo.objects.create(codice='duplicato', nome='A')
        with self.assertRaises(IntegrityError):
            Ruolo.objects.create(codice='duplicato', nome='B')


# ─────────────────────────────────────────────────────────────────
# Test API permessi utente
# ─────────────────────────────────────────────────────────────────
class PermessiUtenteAPITest(APITestCase):

    def test_permessi_utente_admin(self):
        admin = make_user('admin2@test.it', 'admin')
        resp = self.client.get('/api/v1/config/permessi-utente/', **auth_header(admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Admin ha accesso a tutte le risorse
        self.assertIn('risorse', resp.data)
        self.assertGreater(len(resp.data['risorse']), 0)

    def test_permessi_utente_non_autenticato(self):
        resp = self.client.get('/api/v1/config/permessi-utente/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_permessi_utente_role_senza_record(self):
        """Ruolo senza PermessoRuolo → lista risorse vuota."""
        user = make_user('novice@test.it', 'novice_role')
        resp = self.client.get('/api/v1/config/permessi-utente/', **auth_header(user))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['risorse'], [])

    def test_permessi_utente_con_permesso_leggi(self):
        """Ruolo con permesso 'leggi' su 'bambini' → compare nelle risorse."""
        user = make_user('coord2@test.it', 'coordinatrice')
        grant('coordinatrice', 'bambini', 'leggi', consentito=True)
        resp = self.client.get('/api/v1/config/permessi-utente/', **auth_header(user))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('bambini', resp.data['risorse'])
