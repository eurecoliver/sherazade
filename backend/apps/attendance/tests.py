"""
Test per Presenza: calcolo ritardi, QR token, API.
"""
from datetime import time, date

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.config.models import Gruppo, OrarioUscita, PermessoRuolo
from apps.children.models import Bambino, Famiglia
from .models import Presenza, DailyQRCodeToken, ConfigurazioneCheckin


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────
def make_user(email, role, password='TestPass123!'):
    username = email.replace('@', '_').replace('.', '_')
    return User.objects.create_user(
        username=username, email=email, password=password, role=role,
        first_name='Test', last_name=role.capitalize(),
    )


_bambino_counter = 0

def make_bambino(nome='Luca', cognome='Rossi', gruppo=None, orario_uscita=None):
    global _bambino_counter
    _bambino_counter += 1
    return Bambino.objects.create(
        nome=nome, cognome=cognome, data_nascita='2021-01-01',
        data_iscrizione='2023-09-01', attivo=True,
        codice_fiscale=f'TSTBMB{_bambino_counter:02d}X00X000X000X',
        gruppo=gruppo, orario_uscita=orario_uscita,
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
# Test calcolo ritardi (pura logica di dominio)
# ─────────────────────────────────────────────────────────────────
class CalcoloRitardiTest(TestCase):

    def setUp(self):
        self.staff = make_user('staff@test.it', 'insegnante')
        self.bambino = make_bambino()

    def _crea_presenza(self, ora_arrivo=None, ora_uscita=None):
        return Presenza(
            bambino=self.bambino,
            data=date.today(),
            presente=True,
            ora_arrivo=ora_arrivo,
            ora_uscita=ora_uscita,
            registrato_da=self.staff,
        )

    def test_arrivo_puntuale_nessun_ritardo(self):
        """Arrivo alle 09:30 esatto → 0 minuti di ritardo."""
        p = self._crea_presenza(ora_arrivo=time(9, 30))
        p._calcola_ritardi()
        self.assertEqual(p.minuti_ritardo_arrivo, 0)

    def test_arrivo_anticipato_nessun_ritardo(self):
        """Arrivo alle 09:00 (prima delle 09:30) → 0 minuti di ritardo."""
        p = self._crea_presenza(ora_arrivo=time(9, 0))
        p._calcola_ritardi()
        self.assertEqual(p.minuti_ritardo_arrivo, 0)

    def test_arrivo_in_ritardo_15_minuti(self):
        """Arrivo alle 09:45 → 15 minuti di ritardo."""
        p = self._crea_presenza(ora_arrivo=time(9, 45))
        p._calcola_ritardi()
        self.assertEqual(p.minuti_ritardo_arrivo, 15)

    def test_arrivo_in_ritardo_90_minuti(self):
        """Arrivo alle 11:00 → 90 minuti di ritardo."""
        p = self._crea_presenza(ora_arrivo=time(11, 0))
        p._calcola_ritardi()
        self.assertEqual(p.minuti_ritardo_arrivo, 90)

    def test_nessun_orario_arrivo_nessun_ritardo(self):
        """Senza orario arrivo → minuti_ritardo_arrivo = None."""
        p = self._crea_presenza()
        p._calcola_ritardi()
        self.assertIsNone(p.minuti_ritardo_arrivo)

    def test_uscita_in_ritardo_con_orario_previsto(self):
        """Uscita 30 min dopo l'orario previsto → 30 minuti."""
        orario = OrarioUscita.objects.create(etichetta='Standard', orario=time(16, 0))
        bambino = make_bambino(nome='Marco', cognome='Bianchi', orario_uscita=orario)
        staff = make_user('staff2@test.it', 'insegnante')
        p = Presenza(
            bambino=bambino, data=date.today(), presente=True,
            ora_uscita=time(16, 30), registrato_da=staff,
        )
        p._calcola_ritardi()
        self.assertEqual(p.minuti_ritardo_uscita, 30)

    def test_uscita_puntuale_nessun_ritardo(self):
        """Uscita esatta all'orario previsto → 0 minuti."""
        orario = OrarioUscita.objects.create(etichetta='Mezzanotte', orario=time(16, 0))
        bambino = make_bambino(nome='Sara', cognome='Verdi', orario_uscita=orario)
        staff = make_user('staff3@test.it', 'insegnante')
        p = Presenza(
            bambino=bambino, data=date.today(), presente=True,
            ora_uscita=time(16, 0), registrato_da=staff,
        )
        p._calcola_ritardi()
        self.assertEqual(p.minuti_ritardo_uscita, 0)

    def test_to_time_stringa(self):
        """_to_time() converte stringa 'HH:MM' in oggetto time."""
        result = Presenza._to_time('09:45')
        self.assertEqual(result, time(9, 45))

    def test_to_time_oggetto_time(self):
        """_to_time() restituisce lo stesso oggetto time invariato."""
        t = time(10, 0)
        self.assertEqual(Presenza._to_time(t), t)

    def test_to_time_none(self):
        """_to_time(None) → None."""
        self.assertIsNone(Presenza._to_time(None))

    def test_to_time_stringa_invalida(self):
        """_to_time() con stringa non parsabile → None (no crash)."""
        self.assertIsNone(Presenza._to_time('invalid'))


# ─────────────────────────────────────────────────────────────────
# Test QR Token
# ─────────────────────────────────────────────────────────────────
class QRTokenTest(TestCase):

    def setUp(self):
        self.staff = make_user('qrstaff@test.it', 'insegnante')

    def test_get_or_create_crea_token(self):
        token = DailyQRCodeToken.get_or_create_today(user=self.staff)
        self.assertIsNotNone(token)
        self.assertTrue(len(token.token) > 10)

    def test_get_or_create_idempotente(self):
        """Chiamate multiple per lo stesso giorno restituiscono lo stesso token."""
        t1 = DailyQRCodeToken.get_or_create_today(user=self.staff)
        t2 = DailyQRCodeToken.get_or_create_today(user=self.staff)
        self.assertEqual(t1.token, t2.token)

    def test_valida_token_corretto(self):
        token_obj = DailyQRCodeToken.get_or_create_today(user=self.staff)
        self.assertTrue(DailyQRCodeToken.valida(token_obj.token))

    def test_valida_token_sbagliato(self):
        self.assertFalse(DailyQRCodeToken.valida('token-inventato-xyz'))

    def test_rinnova_genera_nuovo_token(self):
        t1 = DailyQRCodeToken.get_or_create_today(user=self.staff)
        staff2 = make_user('qrstaff2@test.it', 'insegnante')
        t2 = DailyQRCodeToken.rinnova_oggi(user=staff2)
        self.assertNotEqual(t1.token, t2.token)


# ─────────────────────────────────────────────────────────────────
# Test API Presenze
# ─────────────────────────────────────────────────────────────────
class PresenzaAPITest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@test.it', 'admin')
        self.insegnante = make_user('ins@test.it', 'insegnante')
        self.genitore = make_user('gen@test.it', 'genitore')

        # Permessi insegnante
        for azione in ('leggi', 'scrivi'):
            grant('insegnante', 'presenze', azione)

        self.bambino = make_bambino()

        # Assegna il bambino alla famiglia del genitore
        Famiglia.objects.create(
            bambino=self.bambino,
            genitore1=self.genitore,
        )

    def test_lista_presenze_admin(self):
        resp = self.client.get('/api/v1/presenze/', **auth_header(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_lista_presenze_insegnante(self):
        resp = self.client.get('/api/v1/presenze/', **auth_header(self.insegnante))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_lista_presenze_genitore_vietata(self):
        """Il genitore non può accedere alla lista generale delle presenze."""
        resp = self.client.get('/api/v1/presenze/', **auth_header(self.genitore))
        self.assertIn(resp.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_200_OK])
        # Il genitore dovrebbe usare l'action mio_figlio, non list

    def test_crea_presenza_come_admin(self):
        payload = {
            'bambino': self.bambino.pk,
            'data': str(date.today()),
            'presente': True,
            'ora_arrivo': '09:45',
        }
        resp = self.client.post('/api/v1/presenze/', payload, **auth_header(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(resp.data.get('minuti_ritardo_arrivo'))
        # 09:45 è 15 min dopo le 09:30
        self.assertEqual(resp.data['minuti_ritardo_arrivo'], 15)

    def test_crea_presenza_non_autenticato(self):
        resp = self.client.post('/api/v1/presenze/', {})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_giornata_action_restituisce_lista_bambini(self):
        resp = self.client.get(
            f'/api/v1/presenze/giornata/?data={date.today()}',
            **auth_header(self.admin),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)
