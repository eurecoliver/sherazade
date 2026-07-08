"""
Management command per popolare il database con i menu ciclici a 5 settimane,
estratti dai 4 PDF stagionali forniti dalla scuola.

Utilizzo:
    python manage.py seed_menu          # inserisce/aggiorna senza cancellare
    python manage.py seed_menu --clear  # cancella tutto e ricrea da zero
"""

from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.config.models import Gruppo
from apps.meals.models import (
    ConfigMenuCiclo,
    Piatto,
    PiattoAssegnazione,
    SostituzionePiatto,
)
from apps.users.models import User


# ---------------------------------------------------------------------------
# Dati menu — nido piccolo (PICCOLISSIMI + PICCOLI)
# ---------------------------------------------------------------------------

MENU_ESTIVO_NIDO = {
    # settimana 1
    (1, 0): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Fesa di tacchino al vapore tritata/omogenizzato di coniglio",
             "merenda": "Latte di proseguimento"},
    (1, 1): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Latte di proseguimento"},
    (1, 2): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Filetti di nasello al vapore tritati/omogenizzato di nasello",
             "merenda": "Yogurt"},
    (1, 3): {"primo": "Brodo vegetale con passato di verdure, fagioli e pastina",
             "merenda": "Latte di proseguimento"},
    (1, 4): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Parmigiano",
             "merenda": "Yogurt"},
    # settimana 2
    (2, 0): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Carne di bovino al vapore tritata/omogenizzato di manzo",
             "merenda": "Yogurt"},
    (2, 1): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Filetti di platessa al vapore tritati/omogenizzato di platessa",
             "merenda": "Latte di proseguimento"},
    (2, 2): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Robiola",
             "merenda": "Latte di proseguimento"},
    (2, 3): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Yogurt"},
    (2, 4): {"primo": "Brodo vegetale con passato di verdure, lenticchie e pastina",
             "merenda": "Latte di proseguimento"},
    # settimana 3
    (3, 0): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Ricotta",
             "merenda": "Latte di proseguimento"},
    (3, 1): {"primo": "Pastina all'olio e parmigiano",
             "secondo": "Carne di bovino al vapore tritata/omogenizzato di manzo",
             "contorno": "Purea di carote e zucchine",
             "merenda": "Yogurt"},
    (3, 2): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Latte di proseguimento"},
    (3, 3): {"primo": "Brodo vegetale con passato di verdure, fagioli e pastina",
             "merenda": "Latte di proseguimento"},
    (3, 4): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Filetti di merluzzo al vapore tritati/omogenizzato di trota",
             "merenda": "Latte di proseguimento"},
    # settimana 4
    (4, 0): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Yogurt"},
    (4, 1): {"primo": "Crema di ceci con pasta (puntine)",
             "secondo": "Uova strapazzate",
             "contorno": "Carote stufate",
             "merenda": "Yogurt"},
    (4, 2): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Parmigiano",
             "merenda": "Yogurt"},
    (4, 3): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Filetti di spigola al vapore tritati/omogenizzato di spigola",
             "merenda": "Latte di proseguimento"},
    (4, 4): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Fesa di tacchino al vapore tritata/omogenizzato di tacchino",
             "merenda": "Latte di proseguimento"},
    # settimana 5
    (5, 0): {"primo": "Pastina all'olio e parmigiano",
             "secondo": "Petto di pollo al vapore tritato/omogenizzato di pollo",
             "contorno": "Purea di carote",
             "merenda": "Yogurt"},
    (5, 1): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Latte di proseguimento"},
    (5, 2): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Filetti di limanda al vapore tritati/omogenizzato di pesce",
             "merenda": "Latte di proseguimento"},
    (5, 3): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Robiola",
             "merenda": "Yogurt"},
    (5, 4): {"primo": "Brodo vegetale con passato di verdure, fagioli e pastina",
             "merenda": "Latte di proseguimento"},
}

MENU_INVERNALE_NIDO = {
    # settimana 1
    (1, 0): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Yogurt"},
    (1, 1): {"primo": "Brodo vegetale con passato di verdure, fagioli e pastina",
             "merenda": "Latte di proseguimento"},
    (1, 2): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Ricotta",
             "merenda": "Latte di proseguimento"},
    (1, 3): {"primo": "Pastina all'olio e parmigiano",
             "secondo": "Petto di tacchino al vapore tritato/omogenizzato di tacchino",
             "contorno": "Purea di carote",
             "merenda": "Latte di proseguimento"},
    (1, 4): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Filetti di limanda al vapore tritati/omogenizzato di salmone",
             "merenda": "Yogurt"},
    # settimana 2
    (2, 0): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Carne di bovino al vapore tritata/omogenizzato di manzo",
             "merenda": "Latte di proseguimento"},
    (2, 1): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Filetti di platessa al vapore tritati/omogenizzato di platessa",
             "merenda": "Yogurt"},
    (2, 2): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Latte di proseguimento"},
    (2, 3): {"primo": "Brodo vegetale con passato di verdure, fagioli e pastina",
             "merenda": "Yogurt"},
    (2, 4): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Parmigiano",
             "merenda": "Latte di proseguimento"},
    # settimana 3
    (3, 0): {"primo": "Brodo vegetale con passato di verdure, lenticchie e pastina",
             "merenda": "Yogurt"},
    (3, 1): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Latte di proseguimento"},
    (3, 2): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Crescenza",
             "merenda": "Yogurt"},
    (3, 3): {"primo": "Crema di carote con semolino",
             "secondo": "Filetti di merluzzo al vapore tritati/omogenizzato di nasello",
             "merenda": "Latte di proseguimento"},
    (3, 4): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Carne di maiale al vapore tritata/omogenizzato di carne",
             "merenda": "Latte di proseguimento"},
    # settimana 4
    (4, 0): {"primo": "Crema di zucca con pastina",
             "secondo": "Parmigiano",
             "merenda": "Latte di proseguimento"},
    (4, 1): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Petto di pollo al vapore tritato/omogenizzato di coniglio",
             "merenda": "Yogurt"},
    (4, 2): {"primo": "Brodo vegetale con passato di verdure, fagioli e pastina",
             "merenda": "Latte di proseguimento"},
    (4, 3): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Latte di proseguimento"},
    (4, 4): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Filetti di spigola al vapore tritati/omogenizzato di spigola",
             "merenda": "Yogurt"},
    # settimana 5
    (5, 0): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Tuorlo di uovo sodo",
             "merenda": "Latte di proseguimento"},
    (5, 1): {"primo": "Brodo vegetale con passato di verdure e pastina",
             "secondo": "Crescenza",
             "merenda": "Yogurt"},
    (5, 2): {"primo": "Brodo vegetale con passato di verdure e semolino",
             "secondo": "Filetti di nasello al vapore tritati/omogenizzato di nasello",
             "merenda": "Latte di proseguimento"},
    (5, 3): {"primo": "Brodo vegetale con passato di verdure, fagioli e pastina",
             "merenda": "Yogurt"},
    (5, 4): {"primo": "Pastina all'olio e parmigiano",
             "secondo": "Carne di bovino al vapore tritata/omogenizzato di manzo",
             "contorno": "Purea di carote",
             "merenda": "Latte di proseguimento"},
}

# ---------------------------------------------------------------------------
# Dati menu — grandi (PICCOLI MEDI, MEDI, MEDI GRANDI, GRANDI, PONTE)
# ---------------------------------------------------------------------------

MENU_ESTIVO_GRANDI = {
    # settimana 1
    (1, 0): {"primo": "Riso alla parmigiana",
             "secondo": "Bocconcini di tacchino",
             "contorno": "Spinaci all'olio",
             "merenda": "Yogurt e cereali"},
    (1, 1): {"primo": "Pasta (mezze farfalle) al pomodoro e basilico",
             "secondo": "Timballo di nasello al limone",
             "contorno": "Carote all'olio",
             "merenda": "Latte e biscotti"},
    (1, 2): {"primo": "Crema di ceci con pasta (stelline)",
             "secondo": "Uova strapazzate",
             "contorno": "Tortino di zucchine",
             "merenda": "Frullato di banana con latte"},
    (1, 3): {"primo": "Pasta (stortini) all'ortolana",
             "secondo": "Caciotta dolce",
             "contorno": "Fagiolini all'olio",
             "merenda": "Polpa di frutta e fette biscottate"},
    (1, 4): {"primo": "Pasta (mezzi fusilli) al ragù di carne",
             "secondo": "Tortino di patate",
             "merenda": "Focaccia bianca soffice"},
    # settimana 2
    (2, 0): {"primo": "Pasta (gnocchetti sardi) al pomodoro fresco e basilico",
             "secondo": "Frittata",
             "contorno": "Zucchine trifolate",
             "merenda": "Latte e biscotti"},
    (2, 1): {"primo": "Pasta (pipe piccole rigate) all'olio e parmigiano",
             "secondo": "Tortino di fagioli e carote",
             "merenda": "Gelato fior di latte"},
    (2, 2): {"primo": "Crema di verdure con pasta (ditalini rigatini)",
             "secondo": "Ricotta",
             "contorno": "Spinaci all'olio",
             "merenda": "Polpa di frutta e fette biscottate"},
    (2, 3): {"primo": "Pasta (mezze penne rigate) con zucchine",
             "secondo": "Filetti di platessa panati",
             "contorno": "Carote stufate",
             "merenda": "Pane (a fette) e pomodoro"},
    (2, 4): {"primo": "Risotto allo zafferano",
             "secondo": "Polpettone di bovino",
             "contorno": "Bieta all'olio",
             "merenda": "Yogurt e cereali"},
    # settimana 3
    (3, 0): {"primo": "Pasta (stortini) all'ortolana",
             "secondo": "Tortino di patate",
             "merenda": "Gelato fior di latte"},
    (3, 1): {"primo": "Pasta (mezzi fusilli) al burro e parmigiano",
             "secondo": "Tortino di limanda",
             "contorno": "Spinaci all'olio",
             "merenda": "Latte e biscotti"},
    (3, 2): {"primo": "Pasta (lumachine) al trito vegetale",
             "secondo": "Frittata con zucchine",
             "merenda": "Polpa di frutta e fette biscottate"},
    (3, 3): {"primo": "Pasta (gnocchetti sardi) al pesto delicato",
             "secondo": "Straccetti di pollo cremolati",
             "contorno": "Carote all'olio",
             "merenda": "Yogurt e cereali"},
    (3, 4): {"primo": "Crema di lenticchie con farro",
             "secondo": "Ricotta",
             "merenda": "Focaccia bianca soffice"},
    # settimana 4
    (4, 0): {"primo": "Pasta all'olio e parmigiano (mezze farfalle)",
             "secondo": "Fesa di tacchino al limone",
             "contorno": "Zucchine gratinate",
             "merenda": "Polpa di frutta e fette biscottate"},
    (4, 1): {"primo": "Crema di ceci con pasta (puntine)",
             "secondo": "Uova strapazzate",
             "contorno": "Carote stufate",
             "merenda": "Yogurt e cereali"},
    (4, 2): {"primo": "Pasta (pipe piccole rigate) al pesto delicato",
             "secondo": "Medaglioni di nasello al limone",
             "contorno": "Bieta all'olio",
             "merenda": "Yogurt e cereali"},
    (4, 3): {"primo": "Risotto al ragù di carne",
             "secondo": "Ricotta",
             "contorno": "Patate al forno",
             "merenda": "Latte e biscotti"},
    (4, 4): {"primo": "Pasta (stortini) all'ortolana",
             "secondo": "Bocconcini di pollo al tegame",
             "contorno": "Spinaci all'olio e parmigiano",
             "merenda": "Frullato di banana con latte"},
    # settimana 5
    (5, 0): {"primo": "Pasta (mezze penne rigate) rosa",
             "secondo": "Uova strapazzate",
             "contorno": "Carote all'olio",
             "merenda": "Yogurt e cereali"},
    (5, 1): {"primo": "Risotto allo zafferano",
             "secondo": "Polpette di carne mista al pomodoro",
             "contorno": "Bieta all'olio",
             "merenda": "Latte e biscotti"},
    (5, 2): {"primo": "Crema di lenticchie con pasta (corallini)",
             "secondo": "Robiola",
             "contorno": "Zucchine gratinate",
             "merenda": "Focaccia bianca soffice"},
    (5, 3): {"primo": "Pasta (conchigliette) all'ortolana",
             "secondo": "Bocconcini di tacchino",
             "contorno": "Fagiolini all'olio",
             "merenda": "Polpa di frutta e fette biscottate"},
    (5, 4): {"primo": "Pasta (mezze farfalle) con zucchine",
             "secondo": "Filetti di platessa gratinati",
             "contorno": "Patate all'olio",
             "merenda": "Gelato fior di latte"},
}

MENU_INVERNALE_GRANDI = {
    # settimana 1
    (1, 0): {"primo": "Pasta (lumachine) al pomodoro",
             "secondo": "Uova strapazzate",
             "contorno": "Spinaci all'olio",
             "merenda": "Yogurt e cereali"},
    (1, 1): {"primo": "Crema di zucca con pasta (puntine)",
             "secondo": "Polpettone goloso di bovino",
             "contorno": "Finocchi al tegame",
             "merenda": "Frullato di banana con latte"},
    (1, 2): {"primo": "Risotto allo zafferano",
             "secondo": "Caciotta dolce",
             "contorno": "Carote all'olio",
             "merenda": "Latte e biscotti"},
    (1, 3): {"primo": "Crema di ceci con pasta (ditalini rigati)",
             "secondo": "Caciotta dolce",
             "contorno": "Carote all'olio",
             "merenda": "Latte e biscotti"},
    (1, 4): {"primo": "Pasta (mezzi fusilli) all'olio e parmigiano",
             "secondo": "Medaglioni di limanda",
             "contorno": "Patate al tegame",
             "merenda": "Focaccia rossa soffice"},
    # settimana 2
    (2, 0): {"primo": "Timballo di pasta (mezze conchiglie rigate)",
             "contorno": "Zucca al tegame",
             "merenda": "Frullato di banana con latte"},
    (2, 1): {"primo": "Risotto con crema di piselli",
             "secondo": "Sformatino di platessa",
             "contorno": "Purea di patate",
             "merenda": "Latte e biscotti"},
    (2, 2): {"primo": "Pasta (stortini) al pomodoro",
             "secondo": "Arrosto di tacchino",
             "contorno": "Spinaci all'olio e parmigiano",
             "merenda": "Spremuta di arancia e ciambellone"},
    (2, 3): {"primo": "Pasta (mezze farfalle) al burro e parmigiano",
             "secondo": "Filetti di platessa panati",
             "contorno": "Carote stufate",
             "merenda": "Polpa di frutta e fette biscottate"},
    (2, 4): {"primo": "Crema di carote con pasta (stelline)",
             "secondo": "Frittata",
             "contorno": "Broccoli romaneschi all'olio",
             "merenda": "Yogurt e cereali"},
    # settimana 3
    (3, 0): {"primo": "Risotto con indivia",
             "secondo": "Straccetti di pollo cremolati",
             "contorno": "Patate al forno",
             "merenda": "Latte e biscotti"},
    (3, 1): {"primo": "Pasta (maccheroncini) all'uovo al pomodoro",
             "secondo": "Robiola",
             "contorno": "Cavolfiori gratinati",
             "merenda": "Polpa di frutta e fette biscottate"},
    (3, 2): {"primo": "Pasta (lumachine) al trito vegetale",
             "secondo": "Uova strapazzate",
             "contorno": "Bieta all'olio",
             "merenda": "Focaccia rossa soffice"},
    (3, 3): {"primo": "Crema di fagioli con pasta (corallini)",
             "secondo": "Uova strapazzate",
             "contorno": "Bieta all'olio",
             "merenda": "Pane (a fette) e olio"},
    (3, 4): {"primo": "Pasta (gnocchetti sardi) rosa",
             "secondo": "Polpette di carne mista al pomodoro",
             "contorno": "Spinaci all'olio e parmigiano",
             "merenda": "Frullato di banana con latte"},
    # settimana 4
    (4, 0): {"primo": "Pasta (lumachine) al burro e parmigiano",
             "secondo": "Bocconcini di tacchino",
             "contorno": "Carote stufate",
             "merenda": "Spremuta di arancia e fette biscottate con confettura"},
    (4, 1): {"primo": "Crema di lenticchie con pasta (ditalini rigati)",
             "secondo": "Frittata",
             "contorno": "Fagiolini all'olio",
             "merenda": "Pane (a fette) e olio"},
    (4, 2): {"primo": "Pasta (pipe piccole rigate) al pesto delicato",
             "secondo": "Medaglioni di nasello al limone",
             "contorno": "Bieta all'olio",
             "merenda": "Yogurt e cereali"},
    (4, 3): {"primo": "Pasta (conchigliette) con zucca",
             "secondo": "Crocchette di nasello",
             "contorno": "Finocchi al tegame",
             "merenda": "Yogurt e cereali"},
    (4, 4): {"primo": "Crema di verdure con pasta (semi di melone)",
             "secondo": "Ricotta",
             "contorno": "Zucca gratinata",
             "merenda": "Latte e biscotti"},
    # settimana 5
    (5, 0): {"primo": "Crema di piselli con pasta (puntine)",
             "secondo": "Caciotta dolce",
             "contorno": "Finocchi gratinati",
             "merenda": "Focaccia rossa soffice"},
    (5, 1): {"primo": "Pasta (mezze penne rigate) al pomodoro",
             "secondo": "Bocconcini di pollo al tegame",
             "contorno": "Spinaci all'olio",
             "merenda": "Yogurt e cereali"},
    (5, 2): {"primo": "Pasta (conchiglietti) e patate",
             "secondo": "Arrosto di bovino",
             "contorno": "Cavolfiori all'olio",
             "merenda": "Focaccia bianca soffice"},
    (5, 3): {"primo": "Pasta (mezzi fusilli) rosa",
             "secondo": "Uova strapazzate",
             "contorno": "Bieta al pomodoro",
             "merenda": "Latte e biscotti"},
    (5, 4): {"primo": "Riso alla parmigiana",
             "secondo": "Medaglioni di spigola",
             "contorno": "Carote all'olio",
             "merenda": "Polpa di frutta e fette biscottate"},
}

# ---------------------------------------------------------------------------
# Mapping tipo piatto → Piatto.Tipo
# ---------------------------------------------------------------------------
TIPO_MAP = {
    "colazione": Piatto.Tipo.COLAZIONE,
    "primo": Piatto.Tipo.PRIMO,
    "secondo": Piatto.Tipo.SECONDO,
    "monopiatto": Piatto.Tipo.MONOPIATTO,
    "contorno": Piatto.Tipo.CONTORNO,
    "pane": Piatto.Tipo.PANE,
    "frutta": Piatto.Tipo.FRUTTA,
    "merenda": Piatto.Tipo.MERENDA,
}


class Command(BaseCommand):
    help = "Popola il database con i menu ciclici a 5 settimane dai PDF stagionali"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Cancella tutti i dati menu esistenti prima di ricrerarli",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("🗑️  Cancellazione dati menu esistenti...")
            SostituzionePiatto.objects.all().delete()
            PiattoAssegnazione.objects.all().delete()
            Piatto.objects.all().delete()
            ConfigMenuCiclo.objects.all().delete()
            self.stdout.write(self.style.WARNING("  Cancellati SostituzionePiatto, PiattoAssegnazione, Piatto, ConfigMenuCiclo"))

        # --- Recupero utente admin ---
        admin = User.objects.filter(role="admin").first()
        if not admin:
            self.stdout.write(self.style.ERROR("❌  Nessun utente admin trovato. Esegui prima seed_demo."))
            return

        # --- ConfigMenuCiclo ---
        # Lunedì 2 giugno 2026 = settimana di riferimento per il ciclo
        ciclo, created = ConfigMenuCiclo.objects.get_or_create(
            pk=1,
            defaults={
                "data_inizio_ciclo": date(2026, 6, 2),
                "aggiornato_da": admin,
            },
        )
        if not created:
            ciclo.data_inizio_ciclo = date(2026, 6, 2)
            ciclo.aggiornato_da = admin
            ciclo.save()
        self.stdout.write(f"📅  ConfigMenuCiclo: data_inizio_ciclo = {ciclo.data_inizio_ciclo}")

        # --- Recupero gruppi ---
        gruppi_nido = list(Gruppo.objects.filter(nome__in=["PICCOLISSIMI", "PICCOLI"]).order_by("ordine"))
        gruppi_grandi = list(Gruppo.objects.filter(nome__in=["PICCOLI MEDI", "MEDI", "MEDI GRANDI", "GRANDI", "PONTE"]).order_by("ordine"))
        tutti_gruppi = list(Gruppo.objects.filter(attivo=True).order_by("ordine"))

        if len(gruppi_nido) < 2:
            self.stdout.write(self.style.WARNING(
                f"⚠️  Trovati solo {len(gruppi_nido)} gruppi nido (PICCOLISSIMI/PICCOLI). "
                "Esegui prima seed_demo --clear."
            ))
        if len(gruppi_grandi) < 5:
            self.stdout.write(self.style.WARNING(
                f"⚠️  Trovati solo {len(gruppi_grandi)} gruppi grandi. "
                "Esegui prima seed_demo --clear."
            ))

        totale_piatti = 0
        totale_assegnazioni = 0

        # --- Piatti "sempre" (frutta e pane per tutti) ---
        totale_piatti, totale_assegnazioni = self._crea_sempre(
            tutti_gruppi, admin, totale_piatti, totale_assegnazioni
        )

        # --- Menu stagionali ---
        configs = [
            (MENU_ESTIVO_NIDO,     "ESTIVO NIDO",     gruppi_nido,   date(2026, 4, 1), date(2026, 10, 31)),
            (MENU_INVERNALE_NIDO,  "INVERNALE NIDO",  gruppi_nido,   date(2026, 11, 1), date(2027, 3, 31)),
            (MENU_ESTIVO_GRANDI,   "ESTIVO GRANDI",   gruppi_grandi, date(2026, 4, 1), date(2026, 10, 31)),
            (MENU_INVERNALE_GRANDI,"INVERNALE GRANDI",gruppi_grandi, date(2026, 11, 1), date(2027, 3, 31)),
        ]

        for dati_menu, nome_menu, gruppi, d_inizio, d_fine in configs:
            self.stdout.write(f"\n📋  Menu {nome_menu} ({d_inizio} → {d_fine}) — {len(gruppi)} gruppi")
            n_p, n_a = self._crea_menu(dati_menu, nome_menu, gruppi, d_inizio, d_fine, admin)
            totale_piatti += n_p
            totale_assegnazioni += n_a

        self.stdout.write(self.style.SUCCESS(
            f"\n✅  Completato: {totale_piatti} piatti creati, {totale_assegnazioni} assegnazioni create."
        ))

    def _crea_sempre(self, tutti_gruppi, admin, totale_piatti, totale_assegnazioni):
        """Crea i piatti validi tutto l'anno: Frutta fresca e Pane."""
        sempre = [
            ("Frutta fresca di stagione", "frutta"),
            ("Pane",                      "pane"),
        ]
        for descrizione, tipo_key in sempre:
            piatto, created = Piatto.objects.get_or_create(
                tipo=TIPO_MAP[tipo_key],
                descrizione=descrizione,
                defaults={
                    "attivo": True,
                    "data_inizio": None,
                    "data_fine": None,
                },
            )
            if created:
                totale_piatti += 1
                self.stdout.write(f"  🍽️  Creato piatto sempre: {descrizione}")

            # Assegna a tutti i gruppi, tutti i giorni di tutte le settimane
            giorni_per_settimana = {str(s): [0, 1, 2, 3, 4] for s in range(1, 6)}
            assegnazione, a_created = PiattoAssegnazione.objects.get_or_create(
                piatto=piatto,
                sempre=True,
                defaults={"giorni_per_settimana": giorni_per_settimana},
            )
            assegnazione.giorni_per_settimana = giorni_per_settimana
            assegnazione.save()
            assegnazione.gruppi.set(tutti_gruppi)
            if a_created:
                totale_assegnazioni += 1

        return totale_piatti, totale_assegnazioni

    def _crea_menu(self, dati_menu, nome_menu, gruppi, d_inizio, d_fine, admin):
        """Crea piatti e assegnazioni per un menu stagionale."""
        piatti_creati = 0
        assegnazioni_create = 0

        # Raggruppa per (tipo, descrizione) → lista di (settimana, giorno)
        # per evitare duplicati quando lo stesso piatto appare in più giorni
        piatto_giorni: dict[tuple, list] = {}
        for (settimana, giorno), portate in dati_menu.items():
            for tipo_key, descrizione in portate.items():
                chiave = (tipo_key, descrizione, d_inizio, d_fine)
                if chiave not in piatto_giorni:
                    piatto_giorni[chiave] = []
                piatto_giorni[chiave].append((settimana, giorno))

        for (tipo_key, descrizione, data_inizio, data_fine), occorrenze in piatto_giorni.items():
            # Crea o recupera il piatto
            piatto, p_created = Piatto.objects.get_or_create(
                tipo=TIPO_MAP[tipo_key],
                descrizione=descrizione,
                data_inizio=data_inizio,
                data_fine=data_fine,
                defaults={"attivo": True},
            )
            if p_created:
                piatti_creati += 1

            # Costruisci giorni_per_settimana da tutte le occorrenze
            giorni_per_settimana: dict[str, list[int]] = {}
            for settimana, giorno in occorrenze:
                k = str(settimana)
                if k not in giorni_per_settimana:
                    giorni_per_settimana[k] = []
                if giorno not in giorni_per_settimana[k]:
                    giorni_per_settimana[k].append(giorno)

            # Crea o aggiorna l'assegnazione
            assegnazione, a_created = PiattoAssegnazione.objects.get_or_create(
                piatto=piatto,
                sempre=False,
                defaults={"giorni_per_settimana": giorni_per_settimana},
            )
            if not a_created:
                # Aggiorna i giorni se il piatto esisteva già
                assegnazione.giorni_per_settimana = giorni_per_settimana
                assegnazione.save()
            else:
                assegnazioni_create += 1

            assegnazione.gruppi.set(gruppi)

        self.stdout.write(
            f"  ✔  {piatti_creati} piatti, {assegnazioni_create} assegnazioni nuove"
        )
        return piatti_creati, assegnazioni_create
