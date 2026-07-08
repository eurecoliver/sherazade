"""
Management command: seed_demo
Carica dati dimostrativi realistici per test pre go-live.

Uso:
    python manage.py seed_demo
    python manage.py seed_demo --clear   # cancella demo prima di ricrearlo
"""
import random
from datetime import date, timedelta, time

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

# ---------------------------------------------------------------------------
# Dati realistici
# ---------------------------------------------------------------------------
NOMI_M = ['Luca', 'Marco', 'Matteo', 'Andrea', 'Lorenzo', 'Davide', 'Riccardo', 'Filippo']
NOMI_F = ['Sofia', 'Giulia', 'Martina', 'Sara', 'Alice', 'Chiara', 'Valentina', 'Emma']
COGNOMI = ['Rossi', 'Ferrari', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Bruno',
           'Greco', 'De Luca', 'Conti', 'Costa', 'Mancini', 'Fontana', 'Barbieri']

ATTIVITA = [
    'Abbiamo dipinto con i colori a dita e creato bellissimi quadri astratti.',
    'Giornata dedicata alla musica: percussioni, canzoncine e balli.',
    'Laboratorio di manipolazione con pasta di sale e argilla.',
    'Lettura animata de "Il Piccolo Principe" con domande e riflessioni.',
    'Gioco libero in giardino, arrampicata e corse sul prato.',
    'Costruzione con i blocchi Lego: ogni bambino ha fatto la propria casetta.',
    'Attività motoria con cerchi, coni e palloni colorati.',
    'Laboratorio di cucina: biscotti al miele fatti insieme.',
    'Disegno libero con pastelli e poi esposizione in classe.',
    'Giochiamo con l\'acqua: travasi, misure, galleggiamento.',
]

NOTE = [
    'Giornata molto positiva, bambino sereno e partecipe.',
    'Ha dormito bene durante il riposo pomeridiano.',
    'Qualche momento di malinconia a metà mattina, poi si è ripreso.',
    'Grande concentrazione nelle attività strutturate.',
    'Molto socievole, ha giocato con tutti i compagni.',
    'Ha mangiato con ottimo appetito.',
    'Piccola caduta in giardino, niente di grave, solo lieve abrasiome al ginocchio.',
    '',
    '',
    '',  # alcune note vuote per realismo
]


def _giorni_lavorativi(n):
    """Restituisce gli ultimi n giorni lavorativi a partire da ieri."""
    giorni = []
    d = date.today() - timedelta(days=1)
    while len(giorni) < n:
        if d.weekday() < 5:  # lun-ven
            giorni.append(d)
        d -= timedelta(days=1)
    return giorni


class Command(BaseCommand):
    help = 'Carica dati dimostrativi per test pre go-live'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true',
                            help='Cancella i dati demo esistenti prima di ricrearne')

    def handle(self, *args, **options):
        if options['clear']:
            self._clear()

        self.stdout.write(self.style.MIGRATE_HEADING('🌱 Avvio seed dati demo...'))

        admin = User.objects.filter(role='admin').first()
        if not admin:
            self.stdout.write(self.style.ERROR('❌ Nessun utente admin trovato. Creane uno prima.'))
            return

        gruppi = self._setup_gruppi()
        orari = self._setup_orari()
        bambini = self._crea_bambini(gruppi, orari, admin)
        self._crea_presenze(bambini, admin)
        self._crea_diari(bambini, admin)

        tester_bambini = self._crea_tester_famiglie(gruppi, orari, admin)
        self._crea_presenze(tester_bambini, admin)
        self._crea_diari(tester_bambini, admin)

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Seed completato: {len(bambini) + len(tester_bambini)} bambini totali '
            f'({len(bambini)} demo + {len(tester_bambini)} tester), '
            f'famiglie, consensi, presenze e diari creati.'
        ))
        self.stdout.write(self.style.MIGRATE_HEADING('\n📋 Account tester genitore:'))
        self.stdout.write('  tester1@demo.sherazade.it / Demo1234!  — Famiglia Bianchi (3 figli)')
        self.stdout.write('  tester2@demo.sherazade.it / Demo1234!  — Famiglia Bianchi (stesso genitore2)')
        self.stdout.write('  tester3@demo.sherazade.it / Demo1234!  — Famiglia Verdi (4 figli, genitore singolo)')
        self.stdout.write('  tester4@demo.sherazade.it / Demo1234!  — Famiglia Russo (3 figli)')
        self.stdout.write('  tester5@demo.sherazade.it / Demo1234!  — Famiglia Russo (stesso genitore2)')

    # ------------------------------------------------------------------
    def _clear(self):
        from apps.attendance.models import Presenza
        from apps.diary.models import RegistroDiario
        from apps.consents.models import ConsensoFotografico
        from apps.meals.models import AllergiaIntolleranza
        from apps.children.models import Bambino, Famiglia, DelegaRitiro

        DelegaRitiro.objects.filter(bambino__note_mediche__startswith='[DEMO]').delete()
        Presenza.objects.filter(bambino__note_mediche__startswith='[DEMO]').delete()
        RegistroDiario.objects.filter(bambino__note_mediche__startswith='[DEMO]').delete()
        ConsensoFotografico.objects.filter(bambino__note_mediche__startswith='[DEMO]').delete()
        AllergiaIntolleranza.objects.filter(bambino__note_mediche__startswith='[DEMO]').delete()
        Famiglia.objects.filter(bambino__note_mediche__startswith='[DEMO]').delete()
        Bambino.objects.filter(note_mediche__startswith='[DEMO]').delete()
        User.objects.filter(email__endswith='@demo.sherazade.it').delete()
        self.stdout.write('🗑️  Dati demo e tester precedenti rimossi.')

    # ------------------------------------------------------------------
    def _setup_gruppi(self):
        from apps.config.models import Gruppo
        defaults = [
            ('PICCOLISSIMI', '#FF9AA2', 1),
            ('PICCOLI',      '#FFB347', 2),
            ('PICCOLI MEDI', '#FDFD96', 3),
            ('MEDI',         '#77DD77', 4),
            ('MEDI GRANDI',  '#84B6F4', 5),
            ('GRANDI',       '#B39EB5', 6),
            ('PONTE',        '#FF6961', 7),
        ]
        gruppi = []
        for nome, colore, ordine in defaults:
            g, created = Gruppo.objects.get_or_create(
                nome=nome,
                defaults={'colore': colore, 'ordine': ordine, 'attivo': True}
            )
            gruppi.append(g)
            if created:
                self.stdout.write(f'  Gruppo creato: {nome}')
        return gruppi

    def _setup_orari(self):
        from apps.config.models import OrarioUscita
        defaults = [
            ('Uscita 13:00', time(13, 0), 1),
            ('Uscita 15:30', time(15, 30), 2),
            ('Uscita 16:30', time(16, 30), 3),
        ]
        orari = []
        for etichetta, orario, ordine in defaults:
            o, created = OrarioUscita.objects.get_or_create(
                etichetta=etichetta,
                defaults={'orario': orario, 'ordine': ordine, 'attivo': True}
            )
            orari.append(o)
            if created:
                self.stdout.write(f'  Orario creato: {etichetta}')
        return orari

    # ------------------------------------------------------------------
    def _crea_bambini(self, gruppi, orari, admin):
        from apps.children.models import Bambino, Famiglia, DelegaRitiro
        from apps.consents.models import ConsensoFotografico
        from apps.meals.models import AllergiaIntolleranza

        bambini_data = [
            # (nome, cognome, sesso, data_nascita, gruppo_idx, orario_idx, allergia?)
            # Indici: 0=PICCOLISSIMI,1=PICCOLI,2=PICCOLI MEDI,3=MEDI,4=MEDI GRANDI,5=GRANDI,6=PONTE
            # PICCOLI MEDI (2) — 12-18 mesi, nati ~2025
            ('Giada',     'Ferrara',   'F', date(2025, 2, 18), 2, 0, None),
            ('Mattia',    'Lombardi',  'M', date(2025, 5, 7),  2, 0, None),
            # MEDI (3) — 18-24 mesi, nati ~2024
            ('Chloe',     'Gallo',     'F', date(2024, 8, 22), 3, 0, None),
            ('Edoardo',   'Vitale',    'M', date(2024, 11, 3), 3, 0, 'Latte'),
            # MEDI GRANDI (4) — 2-3 anni, nati ~2023
            ('Irene',     'Montanari', 'F', date(2023, 4, 14), 4, 1, None),
            ('Simone',    'Pellegrini','M', date(2023, 9, 25), 4, 1, 'Uova'),
            # GRANDI (5) — 4-5 anni, nati ~2021
            ('Sofia',     'Rossi',     'F', date(2021, 3, 12), 5, 1, None),
            ('Giulia',    'Esposito',  'F', date(2021, 11, 20),5, 2, None),
            ('Martina',   'Colombo',   'F', date(2021, 6, 3),  5, 1, None),
            ('Alice',     'Marino',    'F', date(2021, 4, 27), 5, 1, 'Arachidi'),
            ('Valentina', 'Conti',     'F', date(2021, 1, 22), 5, 1, None),
            # PONTE (6) — 5-6 anni, nati ~2020
            ('Luca',      'Ferrari',   'M', date(2020, 7, 5),  6, 2, None),
            ('Marco',     'Romano',    'M', date(2020, 2, 14), 6, 2, None),
            ('Andrea',    'Ricci',     'M', date(2020, 9, 18), 6, 2, None),
            ('Davide',    'De Luca',   'M', date(2020, 5, 9),  6, 2, None),
            ('Lorenzo',   'Bruno',     'M', date(2020, 12, 1), 6, 2, None),
            ('Chiara',    'Greco',     'F', date(2021, 8, 15), 6, 0, None),
            ('Matteo',    'Costa',     'M', date(2020, 10, 30),6, 2, 'Glutine'),
        ]

        bambini = []
        for idx, (nome, cognome, sesso, dnascita, g_idx, o_idx, allergia) in enumerate(bambini_data):
            cf = f'DEMO{idx:02d}X00X000X{idx:03d}'[:16].ljust(16, 'X')

            b, created = Bambino.objects.get_or_create(
                codice_fiscale=cf,
                defaults=dict(
                    nome=nome,
                    cognome=cognome,
                    data_nascita=dnascita,
                    gruppo=gruppi[g_idx],
                    orario_uscita=orari[o_idx],
                    data_iscrizione=date(2024, 9, 1),
                    attivo=True,
                    note_mediche='[DEMO] Dato esemplificativo per test.',
                )
            )
            if not created:
                bambini.append(b)
                continue

            # Genitori
            g1 = self._crea_genitore(nome='Maria' if sesso == 'F' else 'Giuseppe',
                                      cognome=cognome, idx=idx, n=1)
            g2 = self._crea_genitore(nome='Paolo' if sesso == 'F' else 'Anna',
                                      cognome=cognome, idx=idx, n=2)

            Famiglia.objects.create(
                bambino=b,
                genitore1=g1,
                genitore2=g2,
                telefono_emergenza=f'33{idx}1234567',
                indirizzo=f'Via Roma {10 + idx}, 00100 Roma',
            )

            # Consensi fotografici (tutti completi)
            now = timezone.now()
            for finalita in ['uso_interno', 'genitori_diretti', 'newsletter_scolastica']:
                ConsensoFotografico.objects.get_or_create(
                    bambino=b, finalita=finalita,
                    defaults=dict(
                        consenso_genitore1=True,
                        consenso_genitore2=True,
                        data_consenso_genitore1=now,
                        data_consenso_genitore2=now,
                    )
                )

            # Allergia se prevista
            if allergia:
                gravita = 'grave' if allergia == 'Arachidi' else 'moderata'
                AllergiaIntolleranza.objects.get_or_create(
                    bambino=b, descrizione=allergia,
                    defaults=dict(tipo='allergia', gravita=gravita, attivo=True)
                )

            bambini.append(b)
            self.stdout.write(f'  Bambino creato: {nome} {cognome} ({gruppi[g_idx].nome})')

        return bambini

    def _crea_genitore(self, nome, cognome, idx, n):
        email = f'genitore{idx}_{n}@demo.sherazade.it'
        u, created = User.objects.get_or_create(
            email=email,
            defaults=dict(
                username=email,
                first_name=nome,
                last_name=cognome,
                role='genitore',
                is_active=True,
            )
        )
        if created:
            u.set_password('Demo1234!')
            u.save()
        return u

    # ------------------------------------------------------------------
    def _crea_presenze(self, bambini, admin):
        from apps.attendance.models import Presenza

        giorni = _giorni_lavorativi(10)
        count = 0
        for b in bambini:
            for d in giorni:
                # 10% di assenti
                presente = random.random() > 0.10
                ora_arrivo = None
                motivo = ''
                if presente:
                    # Orario arrivo tra 9:00 e 9:50
                    minuti = random.randint(0, 50)
                    ora_arrivo = time(9, minuti)
                    motivo = ''
                else:
                    motivo = random.choice(['malattia', 'famiglia', 'vacanza'])

                Presenza.objects.get_or_create(
                    bambino=b, data=d,
                    defaults=dict(
                        presente=presente,
                        ora_arrivo=ora_arrivo,
                        motivo_assenza=motivo,
                        assenza_comunicata=not presente,
                        registrato_da=admin,
                    )
                )
                count += 1

        self.stdout.write(f'  Presenze create: {count} record su {len(giorni)} giorni')

    # ------------------------------------------------------------------
    def _crea_diari(self, bambini, admin):
        from apps.diary.models import RegistroDiario

        giorni = _giorni_lavorativi(5)
        count = 0
        umori = ['felice', 'sereno', 'stanco', 'sereno', 'felice']  # distribuiti

        for b in bambini:
            for i, d in enumerate(giorni):
                RegistroDiario.objects.get_or_create(
                    bambino=b, data=d,
                    defaults=dict(
                        autore=admin,
                        umore=umori[i % len(umori)],
                        attivita_descrizione=random.choice(ATTIVITA),
                        note_giornata=random.choice(NOTE),
                        sonno_inizio=time(13, 0),
                        sonno_fine=time(14, random.randint(15, 45)),
                        popo=random.choice([True, False]),
                    )
                )
                count += 1

        self.stdout.write(f'  Diari creati: {count} record su {len(giorni)} giorni')

    # ------------------------------------------------------------------
    def _crea_tester_famiglie(self, gruppi, orari, admin):
        """
        Crea 5 account tester genitore con bambini associati:
          - tester1 + tester2 (Famiglia Bianchi): 3 figli — coppia
          - tester3 (Famiglia Verdi): 4 figli — genitore singolo
          - tester4 + tester5 (Famiglia Russo): 3 figli — coppia
        Ogni tester vede almeno 3 bambini nel portale genitore.
        """
        from apps.children.models import Bambino, Famiglia, DelegaRitiro
        from apps.consents.models import ConsensoFotografico
        from apps.meals.models import AllergiaIntolleranza

        now = timezone.now()

        # ---- account tester ----
        def _tester(n, nome, cognome):
            email = f'tester{n}@demo.sherazade.it'
            u, created = User.objects.get_or_create(
                email=email,
                defaults=dict(
                    username=email,
                    first_name=nome,
                    last_name=cognome,
                    role='genitore',
                    is_active=True,
                )
            )
            if created:
                u.set_password('Demo1234!')
                u.save()
                self.stdout.write(f'  Tester creato: {email}')
            return u

        t1 = _tester(1, 'Maria',    'Bianchi')
        t2 = _tester(2, 'Carlo',    'Bianchi')
        t3 = _tester(3, 'Alessia',  'Verdi')
        t4 = _tester(4, 'Roberto',  'Russo')
        t5 = _tester(5, 'Claudia',  'Russo')

        # ---- dati bambini tester ----
        # (nome, cognome, sesso, data_nascita, gruppo_idx, orario_idx, allergia, cf_suffix, g1, g2_o_None)
        # Indici gruppi: 0=PICCOLISSIMI,1=PICCOLI,2=PICCOLI MEDI,3=MEDI,4=MEDI GRANDI,5=GRANDI,6=PONTE
        bianchi_data = [
            ('Emma',   'Bianchi', 'F', date(2021,  4, 10), 5, 2, None,    'BNCEMM00', t1, t2),  # GRANDI
            ('Thomas', 'Bianchi', 'M', date(2022,  1, 25), 4, 1, 'Latte', 'BNCTMS00', t1, t2),  # MEDI GRANDI
            ('Noemi',  'Bianchi', 'F', date(2020, 11,  8), 6, 2, None,    'BNCNMM00', t1, t2),  # PONTE
        ]
        verdi_data = [
            ('Diego',  'Verdi',   'M', date(2021,  7, 14), 5, 1, None,         'VRDDGO00', t3, None),  # GRANDI
            ('Aria',   'Verdi',   'F', date(2022,  3, 22), 4, 0, 'Frutta secca','VRDARA00', t3, None),  # MEDI GRANDI
            ('Zoe',    'Verdi',   'F', date(2020,  9,  5), 6, 2, None,         'VRDZOE00', t3, None),  # PONTE
            ('Leo',    'Verdi',   'M', date(2021, 12, 18), 4, 1, None,         'VRDLEO00', t3, None),  # MEDI GRANDI
        ]
        russo_data = [
            ('Ginevra',  'Russo', 'F', date(2021,  5, 30), 5, 2, None,    'RSSGNV00', t4, t5),  # GRANDI
            ('Federico', 'Russo', 'M', date(2022,  2, 12), 4, 1, None,    'RSSFDR00', t4, t5),  # MEDI GRANDI
            ('Beatrice', 'Russo', 'F', date(2020,  8, 24), 6, 0, 'Uova',  'RSSBTR00', t4, t5),  # PONTE
        ]

        all_data = bianchi_data + verdi_data + russo_data
        bambini = []
        idx_offset = 100  # offset CF per non collidere con bambini demo (che usano 0-11)

        for idx, (nome, cognome, sesso, dnascita, g_idx, o_idx, allergia, cf_base, g1, g2) in enumerate(all_data):
            cf = f'TST{cf_base}{idx_offset + idx:03d}'[:16].ljust(16, 'X')

            b, created = Bambino.objects.get_or_create(
                codice_fiscale=cf,
                defaults=dict(
                    nome=nome,
                    cognome=cognome,
                    data_nascita=dnascita,
                    gruppo=gruppi[g_idx],
                    orario_uscita=orari[o_idx],
                    data_iscrizione=date(2024, 9, 1),
                    attivo=True,
                    note_mediche='[DEMO] Dato tester per test.',
                )
            )
            if not created:
                bambini.append(b)
                continue

            # Famiglia
            famiglia_kwargs = dict(
                bambino=b,
                genitore1=g1,
                telefono_emergenza=f'34{idx + 10}1234567',
                indirizzo=f'Via Nazionale {20 + idx}, 00185 Roma',
            )
            if g2:
                famiglia_kwargs['genitore2'] = g2
            Famiglia.objects.create(**famiglia_kwargs)

            # Consensi fotografici completi
            for finalita in ['uso_interno', 'genitori_diretti', 'newsletter_scolastica']:
                ConsensoFotografico.objects.get_or_create(
                    bambino=b, finalita=finalita,
                    defaults=dict(
                        consenso_genitore1=True,
                        consenso_genitore2=bool(g2),
                        data_consenso_genitore1=now,
                        data_consenso_genitore2=now if g2 else None,
                    )
                )

            # Allergia se prevista
            if allergia:
                gravita = 'grave' if allergia == 'Frutta secca' else 'moderata'
                AllergiaIntolleranza.objects.get_or_create(
                    bambino=b, descrizione=allergia,
                    defaults=dict(tipo='allergia', gravita=gravita, attivo=True)
                )

            bambini.append(b)
            g2_label = g2.get_full_name() if g2 else 'genitore singolo'
            self.stdout.write(
                f'  Bambino tester: {nome} {cognome} ({gruppi[g_idx].nome}) — '
                f'{g1.get_full_name()} + {g2_label}'
            )

        return bambini
