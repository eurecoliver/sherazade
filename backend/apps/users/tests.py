"""
Test per l'autenticazione: login, JWT, cambio password, 2FA, reset password.
"""
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, PasswordResetToken


# ─────────────────────────────────────────────────────────────────
# Helper: crea un utente di test con un dato ruolo
# ─────────────────────────────────────────────────────────────────
def make_user(email, role, password='TestPass123!', is_active=True):
    username = email.replace('@', '_').replace('.', '_')
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        role=role,
        is_active=is_active,
        first_name='Test',
        last_name=role.capitalize(),
    )
    return user


def auth_header(user):
    """Restituisce l'header Authorization con il JWT dell'utente."""
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


# ─────────────────────────────────────────────────────────────────
# Test modello User
# ─────────────────────────────────────────────────────────────────
class UserModelTest(TestCase):

    def test_str_uses_email(self):
        user = make_user('admin@test.it', 'admin')
        self.assertEqual(str(user), f'{user.get_full_name()} ({user.role})')

    def test_role_default(self):
        user = make_user('test@test.it', 'genitore')
        self.assertEqual(user.role, 'genitore')

    def test_two_factor_disabled_by_default(self):
        user = make_user('2fa@test.it', 'insegnante')
        self.assertFalse(user.two_factor_enabled)
        self.assertEqual(user.two_factor_secret, '')

    def test_create_superuser(self):
        su = User.objects.create_superuser(
            username='super',
            email='super@test.it',
            password='Super123!',
        )
        self.assertTrue(su.is_superuser)


# ─────────────────────────────────────────────────────────────────
# Test LoginView
# ─────────────────────────────────────────────────────────────────
@override_settings(RATELIMIT_ENABLE=False)
class LoginViewTest(APITestCase):

    def setUp(self):
        self.url = '/api/v1/auth/login/'
        self.user = make_user('login@test.it', 'insegnante')

    def test_login_successo(self):
        resp = self.client.post(self.url, {'email': 'login@test.it', 'password': 'TestPass123!'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)
        self.assertEqual(resp.data['role'], 'insegnante')

    def test_login_email_sbagliata(self):
        resp = self.client.post(self.url, {'email': 'nonesiste@test.it', 'password': 'TestPass123!'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_password_sbagliata(self):
        resp = self.client.post(self.url, {'email': 'login@test.it', 'password': 'Sbagliata!'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_utente_disabilitato(self):
        disabilitato = make_user('off@test.it', 'insegnante', is_active=False)
        resp = self.client.post(self.url, {'email': 'off@test.it', 'password': 'TestPass123!'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_campi_mancanti(self):
        resp = self.client.post(self.url, {'email': 'login@test.it'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_2fa_abilitato_restituisce_totp_required(self):
        """Quando 2FA è attivo, il login restituisce totp_required invece dei JWT."""
        import pyotp
        self.user.two_factor_enabled = True
        self.user.two_factor_secret = pyotp.random_base32()
        self.user.save()

        resp = self.client.post(self.url, {'email': 'login@test.it', 'password': 'TestPass123!'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get('totp_required'))
        self.assertIn('totp_session', resp.data)
        self.assertNotIn('access', resp.data)

    def test_login_case_insensitive_email(self):
        resp = self.client.post(self.url, {'email': 'LOGIN@TEST.IT', 'password': 'TestPass123!'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────
# Test ChangePasswordView
# ─────────────────────────────────────────────────────────────────
class ChangePasswordTest(APITestCase):

    def setUp(self):
        self.url = '/api/v1/auth/change-password/'
        self.user = make_user('changepw@test.it', 'insegnante')

    def test_cambio_password_corretto(self):
        resp = self.client.post(
            self.url,
            {'current_password': 'TestPass123!', 'new_password': 'NuovaPass456!'},
            **auth_header(self.user),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NuovaPass456!'))

    def test_cambio_password_vecchia_sbagliata(self):
        resp = self.client.post(
            self.url,
            {'current_password': 'Sbagliata!', 'new_password': 'NuovaPass456!'},
            **auth_header(self.user),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cambio_password_richiede_autenticazione(self):
        resp = self.client.post(self.url, {'current_password': 'TestPass123!', 'new_password': 'N!'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────────────────────────────
# Test PasswordResetToken (modello)
# ─────────────────────────────────────────────────────────────────
class PasswordResetTokenModelTest(TestCase):

    def setUp(self):
        self.user = make_user('reset@test.it', 'genitore')

    def test_token_creato_non_usato(self):
        token = PasswordResetToken.objects.create(user=self.user, token='abc123')
        self.assertFalse(token.usato)

    def test_token_str(self):
        token = PasswordResetToken.objects.create(user=self.user, token='xyz')
        self.assertIn('reset@test.it', str(token))


# ─────────────────────────────────────────────────────────────────
# Test MeView (profilo utente autenticato)
# ─────────────────────────────────────────────────────────────────
class MeViewTest(APITestCase):

    def test_me_autenticato(self):
        user = make_user('me@test.it', 'coordinatrice')
        resp = self.client.get('/api/v1/auth/me/', **auth_header(user))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['email'], 'me@test.it')
        self.assertEqual(resp.data['role'], 'coordinatrice')

    def test_me_non_autenticato(self):
        resp = self.client.get('/api/v1/auth/me/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
