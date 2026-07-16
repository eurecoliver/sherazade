"""
Management command per verificare l'integrità del menu ciclico inserito.

Per ogni (fascia_età, stagione, settimana, giorno) verifica che:
- ci sia esattamente 1 primo
- ci sia esattamente 1 merenda
- (GRANDI) ci sia esattamente 1 secondo o 1 monopiatto
- (NIDO) ci sia 0 o 1 secondo (alcuni giorni hanno solo brodo)
- Frutta + Pane siano presenti come "sempre"

Utilizzo:
    python manage.py check_menu
    python manage.py check_menu --verbose   # mostra anche i piatti trovati
"""

from datetime import date

from django.core.management.base import BaseCommand

from apps.meals.models import ConfigMenuCiclo, Piatto, PiattoAssegnazione
from apps.config.models import Gruppo

SETTIMANE = range(1, 6)   # 1–5
GIORNI    = range(0, 5)   # 0=lun … 4=ven

STAGIONI = [
    ("ESTIVO",    date(2026, 4,  1), date(2026, 10, 31)),
    ("INVERNALE", date(2026, 11, 1), date(2027,  3, 31)),
]

NOMI_NIDO   = ["PICCOLISSIMI", "PICCOLI"]
NOMI_GRANDI = ["PICCOLI MEDI", "MEDI", "MEDI GRANDI", "GRANDI", "PONTE"]


class Command(BaseCommand):
    help = "Verifica l'integrità del menu ciclico a 5 settimane"

    def add_arguments(self, parser):
        parser.add_argument("--verbose", action="store_true",
                            help="Mostra anche i piatti trovati per ogni slot")

    def handle(self, *args, **options):
        verbose = options["verbose"]
        errori = 0

        self.stdout.write("\n🔍  Verifica menu ciclico — Sherazade\n")

        # Controllo ConfigMenuCiclo
        try:
            ciclo = ConfigMenuCiclo.objects.get(pk=1)
            self.stdout.write(f"📅  Ciclo configurato: {ciclo.data_inizio_ciclo}\n")
        except ConfigMenuCiclo.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌  ConfigMenuCiclo non trovato!"))
            return

        # Piatti "sempre"
        sempre = list(Piatto.objects.filter(
            assegnazioni__sempre=True, attivo=True
        ).distinct())
        if len(sempre) >= 2:
            self.stdout.write(f"✅  Piatti sempre: {', '.join(p.descrizione for p in sempre)}")
        else:
            self.stdout.write(self.style.WARNING(
                f"⚠️  Solo {len(sempre)} piatti 'sempre' trovati (attesi: Frutta + Pane)"
            ))
            errori += 1

        for nome_stagione, d_inizio, d_fine in STAGIONI:
            self.stdout.write(f"\n{'='*60}")
            self.stdout.write(f"📋  Stagione: {nome_stagione}  ({d_inizio} → {d_fine})\n")

            for fascia, nomi_gruppi, rules in [
                ("NIDO",   NOMI_NIDO,   {"primo": (1, 1), "merenda": (1, 1), "secondo": (0, 1)}),
                ("GRANDI", NOMI_GRANDI, {"primo": (1, 1), "merenda": (1, 1), "secondo": (0, 1), "monopiatto": (0, 1)}),
            ]:
                gruppi = list(Gruppo.objects.filter(nome__in=nomi_gruppi))
                gruppo_ids = [g.id for g in gruppi]
                if not gruppi:
                    self.stdout.write(self.style.WARNING(
                        f"  ⚠️  Nessun gruppo trovato per fascia {fascia} — esegui seed_demo --clear"
                    ))
                    continue

                self.stdout.write(f"\n  [{fascia}]  gruppi: {', '.join(g.nome for g in gruppi)}")

                # Carica tutte le assegnazioni stagionali per questa fascia
                assegnazioni = list(
                    PiattoAssegnazione.objects
                    .filter(
                        gruppi__id__in=gruppo_ids,
                        sempre=False,
                        piatto__attivo=True,
                        piatto__data_inizio=d_inizio,
                        piatto__data_fine=d_fine,
                    )
                    .select_related("piatto")
                    .distinct()
                )

                slot_errori = 0
                for sett in SETTIMANE:
                    for giorno in GIORNI:
                        # Piatti trovati per questo slot
                        trovati: dict[str, list[str]] = {}
                        for a in assegnazioni:
                            giorni = a.giorni_per_settimana.get(str(sett), [])
                            if giorno in giorni:
                                tipo = a.piatto.tipo
                                trovati.setdefault(tipo, []).append(a.piatto.descrizione)

                        # Verifica regole
                        slot_ok = True
                        msgs = []
                        for tipo, (min_n, max_n) in rules.items():
                            n = len(trovati.get(tipo, []))
                            if n < min_n:
                                msgs.append(f"{tipo}: {n} (min {min_n})")
                                slot_ok = False
                            elif n > max_n:
                                msgs.append(f"{tipo}: {n} (max {max_n})")
                                slot_ok = False

                        # GRANDI: deve esserci almeno 1 tra secondo e monopiatto
                        if fascia == "GRANDI":
                            n_secondi = len(trovati.get("secondo", [])) + len(trovati.get("monopiatto", []))
                            if n_secondi < 1:
                                msgs.append("secondo/monopiatto: 0 (min 1)")
                                slot_ok = False

                        GIORNI_NOMI = ["Lun", "Mar", "Mer", "Gio", "Ven"]
                        tag = f"S{sett}-{GIORNI_NOMI[giorno]}"

                        if not slot_ok:
                            self.stdout.write(self.style.ERROR(
                                f"    ❌ {tag}: {'; '.join(msgs)}"
                            ))
                            slot_errori += 1
                            errori += 1
                        elif verbose:
                            riassunto = {t: v[0] if len(v) == 1 else v for t, v in trovati.items()}
                            self.stdout.write(f"    ✅ {tag}: {riassunto}")

                if slot_errori == 0:
                    self.stdout.write(self.style.SUCCESS(
                        f"    ✅  Tutti i 25 slot ({fascia} {nome_stagione}) sono completi"
                    ))
                else:
                    self.stdout.write(self.style.ERROR(
                        f"    ❌  {slot_errori} slot con problemi"
                    ))

        self.stdout.write(f"\n{'='*60}")
        if errori == 0:
            self.stdout.write(self.style.SUCCESS("\n✅  Verifica completata: nessun errore trovato.\n"))
        else:
            self.stdout.write(self.style.ERROR(f"\n❌  Verifica completata: {errori} problemi trovati.\n"))
