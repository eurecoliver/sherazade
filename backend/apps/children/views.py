import calendar as cal_mod
from datetime import date

from django.db.models import Q
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import Role, User
from apps.audit.mixin import LogAccessoMixin
from .models import Bambino, Famiglia, DelegaRitiro
from .permissions import BambinoPermission, IsDirigente
from .serializers import (
    BambinoSerializer,
    BambinoCuocaSerializer,
    BambinoNoteSerializer,
    FamigliaSerializer,
    FamigliaCreateSerializer,
    DelegaRitiroSerializer,
)


class BambinoViewSet(LogAccessoMixin, viewsets.ModelViewSet):
    risorsa_nome = 'bambino'
    permission_classes = [IsAuthenticated, BambinoPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'cognome', 'codice_fiscale']
    ordering_fields = ['cognome', 'nome', 'data_nascita', 'gruppo__nome']
    ordering = ['cognome', 'nome']

    def get_queryset(self):
        user = self.request.user
        qs = (
            Bambino.objects
            .select_related(
                'famiglia__genitore1',
                'famiglia__genitore2',
                'gruppo',
                'orario_uscita',
            )
            .prefetch_related('deleghe_ritiro')
        )

        if user.role == Role.GENITORE:
            qs = qs.filter(
                Q(famiglia__genitore1=user) | Q(famiglia__genitore2=user)
            )
        elif user.role not in (
            Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE, Role.CUOCA
        ):
            return qs.none()

        # Filtri query string
        gruppo = self.request.query_params.get('gruppo')
        if gruppo:
            qs = qs.filter(gruppo_id=gruppo)

        attivo = self.request.query_params.get('attivo')
        if attivo is not None:
            qs = qs.filter(attivo=attivo.lower() == 'true')

        return qs

    def get_serializer_class(self):
        user = self.request.user
        if user.role == Role.CUOCA:
            return BambinoCuocaSerializer
        if user.role in (Role.COORDINATRICE, Role.INSEGNANTE) and self.action in ('update', 'partial_update'):
            return BambinoNoteSerializer
        return BambinoSerializer

    # ─── Report mensile PDF ───────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='report-mensile')
    def report_mensile(self, request, pk=None):
        """
        Genera un PDF di report mensile per il bambino.
        Parametri: anno (default corrente), mese (default corrente).
        Staff: accesso a qualsiasi bambino.
        Genitore: solo i propri figli.
        """
        from django.http import HttpResponse
        from django.utils import timezone as tz
        from html import escape as he
        from weasyprint import HTML

        from apps.attendance.models import Presenza
        from apps.meals.models import RegistroPasto
        from apps.diary.models import RegistroDiario

        bambino = self.get_object()
        user = request.user

        # Permesso genitore: solo propri figli
        if user.role == Role.GENITORE:
            fam = getattr(bambino, 'famiglia', None)
            if fam is None or (fam.genitore1_id != user.pk and fam.genitore2_id != user.pk):
                return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == Role.CUOCA:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi = date.today()
        try:
            anno = int(request.query_params.get('anno', oggi.year))
            mese = int(request.query_params.get('mese', oggi.month))
        except (ValueError, TypeError):
            return Response({'detail': 'Parametri anno/mese non validi.'}, status=status.HTTP_400_BAD_REQUEST)
        if not (1 <= mese <= 12) or anno < 2020 or anno > oggi.year + 1:
            return Response({'detail': 'Parametri anno/mese non validi.'}, status=status.HTTP_400_BAD_REQUEST)

        MESI_IT = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                   'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
        GIORNI_BREVE = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
        UMORE_EMOJI = {
            'felice': '😊', 'sereno': '🙂', 'stanco': '😴',
            'agitato': '😤', 'triste': '😢',
        }
        QUANTITA_LABEL = {
            'tutto': ('✅', 'Tutto'), 'meta': ('🟡', 'Metà'),
            'poco': ('🟠', 'Poco'), 'nulla': ('❌', 'Nulla'),
        }

        _, giorni_nel_mese = cal_mod.monthrange(anno, mese)

        # Query dati del mese
        presenze = {
            p.data.day: p
            for p in Presenza.objects.filter(bambino=bambino, data__year=anno, data__month=mese)
        }
        pasti = {
            rp.data.day: rp
            for rp in RegistroPasto.objects.filter(bambino=bambino, data__year=anno, data__month=mese)
        }
        diari = {
            rd.data.day: rd
            for rd in RegistroDiario.objects
            .filter(bambino=bambino, data__year=anno, data__month=mese)
            .prefetch_related('tags_cosa_portare')
        }

        # ── Sezione Presenze ─────────────────────────────────────────────────
        presenti = sum(1 for p in presenze.values() if p.presente)
        assenti = sum(1 for p in presenze.values() if not p.presente)
        perc = round(presenti / giorni_nel_mese * 100) if giorni_nel_mese else 0

        celle_cal = ''
        for g in range(1, giorni_nel_mese + 1):
            dow = date(anno, mese, g).weekday()
            p = presenze.get(g)
            if dow >= 5:
                cls = 'giorno weekend'
                lbl = '—'
            elif p is None:
                cls = 'giorno nr'
                lbl = '—'
            elif p.presente:
                cls = 'giorno presente'
                lbl = 'P'
            else:
                motivo = (p.motivo_assenza or 'A').upper()[:1]
                cls = 'giorno assente'
                lbl = motivo
            celle_cal += f'<div class="{cls}"><span class="gnum">{g}</span><span class="glab">{GIORNI_BREVE[dow]}</span><span class="gval">{lbl}</span></div>\n'

        # ── Sezione Pasti ────────────────────────────────────────────────────
        PORTATE = [
            ('colazione', 'Colazione'),
            ('primo', 'Primo'),
            ('secondo', 'Secondo'),
            ('monopiatto', 'Mono'),
            ('contorno', 'Contorno'),
            ('frutta', 'Frutta'),
            ('merenda', 'Merenda'),
        ]
        righe_pasti = ''
        for g in sorted(pasti.keys()):
            rp = pasti[g]
            dow = date(anno, mese, g).weekday()
            celle_pasti = ''
            for campo, _ in PORTATE:
                val = getattr(rp, f'{campo}_quantita', '')
                if val:
                    emoji, _ = QUANTITA_LABEL.get(val, ('', val))
                    celle_pasti += f'<td class="q-{val}">{emoji}</td>'
                else:
                    celle_pasti += '<td class="q-vuoto">—</td>'
            note_row = (
                f'<tr><td colspan="{len(PORTATE) + 1}" class="nota-pasto-cell">'
                f'{he(rp.note_pasto)}</td></tr>'
                if rp.note_pasto else ''
            )
            righe_pasti += f'<tr><td class="data-col">{g} {GIORNI_BREVE[dow]}</td>{celle_pasti}</tr>{note_row}\n'

        header_pasti = ''.join(f'<th>{label}</th>' for _, label in PORTATE)

        # ── Sezione Diario ───────────────────────────────────────────────────
        righe_diario = ''
        for g in sorted(diari.keys()):
            rd = diari[g]
            dow = date(anno, mese, g).weekday()
            umore_emoji = UMORE_EMOJI.get(rd.umore, '') if rd.umore else ''
            sonno_str = ''
            if rd.sonno_inizio and rd.sonno_fine:
                sonno_str = f'<span class="badge-sonno">💤 {rd.sonno_inizio.strftime("%H:%M")}–{rd.sonno_fine.strftime("%H:%M")}</span>'
            elif rd.sonno_inizio:
                sonno_str = f'<span class="badge-sonno">💤 dalle {rd.sonno_inizio.strftime("%H:%M")}</span>'
            popo_str = '<span class="badge-popo">🚽</span>' if rd.popo else ''
            tags = [he(t.nome) for t in rd.tags_cosa_portare.filter(attivo=True)]
            tags_str = ' '.join(f'<span class="badge-tag">{t}</span>' for t in tags)
            attivita = he(rd.attivita_descrizione or '')
            note = he(rd.note_giornata or '')
            righe_diario += f'''
<tr>
  <td class="data-col">{g} {GIORNI_BREVE[dow]}</td>
  <td class="umore-col">{umore_emoji}</td>
  <td class="testo-col">
    {f'<div class="attivita">{attivita}</div>' if attivita else ''}
    {f'<div class="note">{note}</div>' if note else ''}
    <div class="badges">{sonno_str} {popo_str} {tags_str}</div>
  </td>
</tr>'''

        nome_completo = he(f'{bambino.nome} {bambino.cognome}')
        gruppo_nome = he(bambino.gruppo.nome if bambino.gruppo else '—')
        data_stampa = tz.now().strftime('%d/%m/%Y %H:%M')

        html = f'''<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<style>
  @page {{ size: A4; margin: 1.5cm; }}
  body {{ font-family: Arial, sans-serif; font-size: 9pt; color: #222; line-height: 1.4; }}
  /* Header */
  .report-header {{ background: linear-gradient(135deg, #E8725A, #F0C060); color: white;
    padding: 16px 20px; border-radius: 10px; margin-bottom: 16px; display: flex;
    justify-content: space-between; align-items: center; }}
  .report-header .h1 {{ margin: 0; font-size: 18pt; font-weight: bold; }}
  .report-header .sub {{ font-size: 10pt; opacity: 0.9; margin-top: 4px; }}
  .report-header .periodo {{ font-size: 16pt; font-weight: bold; text-align: right; }}
  /* Sezioni */
  h2 {{ font-size: 12pt; color: #555; border-bottom: 2px solid #EEE; padding-bottom: 4px; margin-top: 18px; }}
  /* Presenze */
  .cal-grid {{ display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }}
  .giorno {{ width: 36px; text-align: center; border-radius: 6px; padding: 4px 2px;
    border: 1px solid #DDD; font-size: 7.5pt; }}
  .giorno.presente {{ background: #D5F5E3; border-color: #82C8A0; }}
  .giorno.assente {{ background: #FADBD8; border-color: #F0A09A; }}
  .giorno.nr {{ background: #F5F5F5; color: #BBB; }}
  .giorno.weekend {{ background: #FAFAFA; color: #CCC; }}
  .gnum {{ display: block; font-weight: bold; font-size: 9pt; }}
  .glab {{ display: block; font-size: 6pt; color: #888; }}
  .gval {{ display: block; font-weight: bold; margin-top: 2px; }}
  .pres-stats {{ display: flex; gap: 16px; margin: 8px 0; }}
  .stat-box {{ background: #F8F8F8; border-radius: 8px; padding: 8px 14px; text-align: center;
    border: 1px solid #EEE; flex: 1; }}
  .stat-box .val {{ font-size: 18pt; font-weight: bold; }}
  .stat-box.green .val {{ color: #27AE60; }}
  .stat-box.red .val {{ color: #E74C3C; }}
  .stat-box .lbl {{ font-size: 7pt; color: #888; }}
  /* Pasti */
  table {{ width: 100%; border-collapse: collapse; margin-top: 6px; }}
  th {{ background: #F0F8FF; padding: 5px 4px; border: 1px solid #D5E8F0; font-size: 8pt; text-align: center; }}
  td {{ padding: 4px 5px; border: 1px solid #EEE; text-align: center; font-size: 8pt; }}
  td.data-col {{ text-align: left; font-weight: bold; font-size: 8pt; white-space: nowrap; }}
  td.q-tutto {{ color: #1E8449; font-size: 11pt; }}
  td.q-meta {{ color: #D4AC0D; font-size: 11pt; }}
  td.q-poco {{ color: #CA6F1E; font-size: 11pt; }}
  td.q-nulla {{ color: #A93226; font-size: 11pt; }}
  td.q-vuoto {{ color: #CCC; }}
  td.nota-pasto-cell {{ font-style: italic; color: #888; font-size: 7.5pt; border-top: none; text-align: left; }}
  /* Diario */
  .umore-col {{ font-size: 14pt; text-align: center; width: 30px; }}
  .testo-col {{ text-align: left; }}
  .attivita {{ font-weight: bold; }}
  .note {{ color: #555; font-style: italic; margin-top: 2px; }}
  .badges {{ margin-top: 4px; }}
  .badge-sonno {{ background: #EEF2FF; color: #3730A3; padding: 1px 6px; border-radius: 10px; font-size: 7pt; margin-right: 4px; }}
  .badge-popo {{ background: #FFF7ED; padding: 1px 4px; border-radius: 10px; font-size: 7pt; margin-right: 4px; }}
  .badge-tag {{ background: #F0FDF4; color: #166534; padding: 1px 6px; border-radius: 10px; font-size: 7pt; margin-right: 4px; }}
  /* Footer */
  .footer {{ margin-top: 14px; font-size: 7pt; color: #BBB; border-top: 1px solid #EEE; padding-top: 6px; }}
  .no-data {{ color: #AAA; font-style: italic; font-size: 8.5pt; margin: 6px 0; }}
</style>
</head>
<body>

<div class="report-header">
  <div>
    <div class="h1">{nome_completo}</div>
    <div class="sub">Gruppo: {gruppo_nome}</div>
    <div class="sub">Report mensile generato il {data_stampa}</div>
  </div>
  <div class="periodo">{MESI_IT[mese]}<br>{anno}</div>
</div>

<!-- Presenze -->
<h2>📅 Presenze</h2>
<div class="pres-stats">
  <div class="stat-box green"><div class="val">{presenti}</div><div class="lbl">Giorni presenti</div></div>
  <div class="stat-box red"><div class="val">{assenti}</div><div class="lbl">Giorni assenti</div></div>
  <div class="stat-box"><div class="val">{perc}%</div><div class="lbl">Frequenza</div></div>
  <div class="stat-box"><div class="val">{giorni_nel_mese}</div><div class="lbl">Giorni nel mese</div></div>
</div>
<div class="cal-grid">
{celle_cal}</div>

<!-- Pasti -->
<h2>🍽️ Registro pasti</h2>
{'<table><thead><tr><th>Giorno</th>' + header_pasti + '</tr></thead><tbody>' + righe_pasti + '</tbody></table>' if pasti else '<div class="no-data">Nessun pasto registrato questo mese.</div>'}

<!-- Diario -->
<h2>📔 Diario</h2>
{'<table><thead><tr><th>Giorno</th><th>Umore</th><th style=\'text-align:left\'>Note</th></tr></thead><tbody>' + righe_diario + '</tbody></table>' if diari else '<div class="no-data">Nessun diario registrato questo mese.</div>'}

<div class="footer">Sherazade — documento riservato, uso interno — dati personali tutelati ai sensi del GDPR</div>
</body>
</html>'''

        import re
        pdf_bytes = HTML(string=html).write_pdf()
        safe = re.sub(r'[^\w\-]', '_', f'{bambino.cognome}_{bambino.nome}', flags=re.ASCII)
        nome_file = f'report_{safe}_{anno}_{mese:02d}.pdf'
        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{nome_file}"'
        return resp

    # ─── Export GDPR ─────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='export-gdpr')
    def export_gdpr(self, request, pk=None):
        """
        Genera un PDF con tutti i dati personali del bambino (GDPR Art. 20).
        Admin/Direttrice/Coordinatrice/Insegnante: qualsiasi bambino.
        Genitore: solo i propri figli.
        Cuoca: nessun accesso.
        """
        from django.http import HttpResponse
        from django.utils import timezone as tz
        from html import escape as he
        from weasyprint import HTML
        import re

        from apps.attendance.models import Presenza
        from apps.meals.models import RegistroPasto
        from apps.diary.models import RegistroDiario
        from apps.consents.models import ConsensoFotografico

        bambino = self.get_object()
        user = request.user

        if user.role == Role.GENITORE:
            fam = getattr(bambino, 'famiglia', None)
            if fam is None or (fam.genitore1_id != user.pk and fam.genitore2_id != user.pk):
                return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == Role.CUOCA:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi = date.today()
        due_anni_fa = date(oggi.year - 2, oggi.month, oggi.day)
        anno_fa = date(oggi.year - 1, oggi.month, oggi.day)

        fam = getattr(bambino, 'famiglia', None)
        deleghe = list(bambino.deleghe_ritiro.all().order_by('nominativo'))
        consensi = list(ConsensoFotografico.objects.filter(bambino=bambino).order_by('finalita'))
        presenze = list(Presenza.objects.filter(bambino=bambino, data__gte=due_anni_fa).order_by('data'))
        pasti = list(RegistroPasto.objects.filter(bambino=bambino, data__gte=anno_fa).order_by('data'))
        diari = list(
            RegistroDiario.objects
            .filter(bambino=bambino, data__gte=anno_fa)
            .prefetch_related('tags_cosa_portare')
            .order_by('data')
        )

        FINALITA_LABEL = {
            'uso_interno': 'Uso interno (documentazione)',
            'genitori_diretti': 'Condivisione con genitori',
            'materiale_promozionale': 'Materiale promozionale',
        }
        STATO_LABEL = {
            'completo': '✅ Entrambi i consensi',
            'parziale': '⚠️ Un solo consenso',
            'nessuno': '❌ Nessun consenso',
            'revocato': '🚫 Revocato',
            'non_fotografabile': '🚫 Non fotografabile',
        }
        MESI_IT = ['', 'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                   'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
        GIORNI_BREVE = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
        QUANTITA_LABEL = {
            'tutto': '✅', 'meta': '🟡', 'poco': '🟠', 'nulla': '❌',
        }
        PORTATE = [
            ('colazione', 'Colaz.'), ('primo', 'Primo'), ('secondo', 'Secondo'),
            ('monopiatto', 'Mono'), ('contorno', 'Cont.'),
            ('frutta', 'Frutta'), ('merenda', 'Mer.'),
        ]

        def fmt_date(d):
            if d is None:
                return '—'
            return d.strftime('%d/%m/%Y')

        def nome_utente(u):
            if u is None:
                return '—'
            parts = [u.first_name, u.last_name]
            n = ' '.join(p for p in parts if p).strip()
            return he(n or u.email)

        # ── 1. Anagrafica ─────────────────────────────────────────────────────
        nome_completo = he(f'{bambino.nome} {bambino.cognome}')
        alias_str = he(bambino.alias_nome or '') if bambino.alias_attivo and bambino.alias_nome else ''
        gruppo_nome = he(bambino.gruppo.nome if bambino.gruppo else '—')
        orario_str = he(str(bambino.orario_uscita.orario) if bambino.orario_uscita else '—')

        righe_anag = f'''
<tr><th>Nome completo</th><td>{nome_completo}</td></tr>
<tr><th>Alias</th><td>{alias_str or '—'}</td></tr>
<tr><th>Codice Fiscale</th><td>{he(bambino.codice_fiscale or '—')}</td></tr>
<tr><th>Data di nascita</th><td>{fmt_date(bambino.data_nascita)}</td></tr>
<tr><th>Luogo di nascita</th><td>{he(bambino.luogo_nascita or '—')}</td></tr>
<tr><th>Sesso</th><td>{he(bambino.sesso or '—')}</td></tr>
<tr><th>Gruppo</th><td>{gruppo_nome}</td></tr>
<tr><th>Orario uscita previsto</th><td>{orario_str}</td></tr>
<tr><th>Attivo</th><td>{'Sì' if bambino.attivo else 'No'}</td></tr>
<tr><th>Note mediche</th><td>{he(bambino.note_mediche or '—')}</td></tr>
<tr><th>Non fotografabile</th><td>{'Sì (override assoluto consensi)' if bambino.non_fotografabile else 'No'}</td></tr>
'''

        # ── 2. Famiglia ──────────────────────────────────────────────────────
        righe_fam = '<tr><td colspan="2" class="no-data">Nessuna famiglia associata.</td></tr>'
        if fam:
            g1 = fam.genitore1
            g2 = fam.genitore2
            g1_cf = he(getattr(g1, 'codice_fiscale', '') or '—') if g1 else '—'
            g1_ind = he(getattr(g1, 'indirizzo', '') or '—') if g1 else '—'
            g2_cf = he(getattr(g2, 'codice_fiscale', '') or '—') if g2 else '—'
            g2_ind = he(getattr(g2, 'indirizzo', '') or '—') if g2 else '—'
            righe_fam = f'''
<tr><th>Genitore 1 — Nome</th><td>{nome_utente(g1)}</td></tr>
<tr><th>Genitore 1 — Email</th><td>{he(g1.email) if g1 else '—'}</td></tr>
<tr><th>Genitore 1 — Telefono</th><td>{he(getattr(g1, 'telefono', '') or '—') if g1 else '—'}</td></tr>
<tr><th>Genitore 1 — CF</th><td>{g1_cf}</td></tr>
<tr><th>Genitore 1 — Indirizzo</th><td>{g1_ind}</td></tr>
<tr><th>Genitore 2 — Nome</th><td>{nome_utente(g2)}</td></tr>
<tr><th>Genitore 2 — Email</th><td>{he(g2.email) if g2 else '—'}</td></tr>
<tr><th>Genitore 2 — Telefono</th><td>{he(getattr(g2, 'telefono', '') or '—') if g2 else '—'}</td></tr>
<tr><th>Genitore 2 — CF</th><td>{g2_cf}</td></tr>
<tr><th>Genitore 2 — Indirizzo</th><td>{g2_ind}</td></tr>
<tr><th>Indirizzo famiglia</th><td>{he(fam.indirizzo or '—')}</td></tr>
'''

        # ── 3. Deleghe ritiro ────────────────────────────────────────────────
        righe_deleghe = ''
        for d in deleghe:
            stato_d = 'Attiva' if d.attivo else 'Revocata'
            righe_deleghe += f'<tr><td>{he(d.nominativo)}</td><td>{he(d.telefono or "—")}</td><td>{he(d.relazione or "—")}</td><td>{stato_d}</td></tr>\n'
        if not righe_deleghe:
            righe_deleghe = '<tr><td colspan="4" class="no-data">Nessuna delega registrata.</td></tr>'

        # ── 4. Consensi fotografici ──────────────────────────────────────────
        righe_consensi = ''
        for c in consensi:
            finalita = FINALITA_LABEL.get(c.finalita, c.finalita)
            stato = STATO_LABEL.get(c.stato, c.stato)
            data_g1 = fmt_date(c.data_consenso_genitore1)
            data_g2 = fmt_date(c.data_consenso_genitore2)
            rev = f' (revocato il {fmt_date(c.data_revoca)})' if c.revocato and c.data_revoca else ''
            righe_consensi += f'<tr><td>{finalita}</td><td>{stato}{rev}</td><td>{data_g1}</td><td>{data_g2}</td></tr>\n'
        if not righe_consensi:
            righe_consensi = '<tr><td colspan="4" class="no-data">Nessun consenso registrato.</td></tr>'

        # ── 5. Presenze ──────────────────────────────────────────────────────
        righe_presenze = ''
        for p in presenze:
            dow = p.data.weekday()
            stato_p = 'Presente' if p.presente else f'Assente ({p.get_motivo_assenza_display() if p.motivo_assenza else "non specificato"})'
            ora_a = p.ora_arrivo.strftime('%H:%M') if p.ora_arrivo else '—'
            ora_u = p.ora_uscita.strftime('%H:%M') if p.ora_uscita else '—'
            ritardo_a = f'+{p.minuti_ritardo_arrivo}m' if p.minuti_ritardo_arrivo else ''
            ritardo_u = f'+{p.minuti_ritardo_uscita}m' if p.minuti_ritardo_uscita else ''
            righe_presenze += (
                f'<tr><td class="data-col">{p.data.day} {MESI_IT[p.data.month]} {p.data.year} {GIORNI_BREVE[dow]}</td>'
                f'<td>{stato_p}</td><td>{ora_a} {ritardo_a}</td><td>{ora_u} {ritardo_u}</td></tr>\n'
            )
        if not righe_presenze:
            righe_presenze = '<tr><td colspan="4" class="no-data">Nessuna presenza registrata negli ultimi 2 anni.</td></tr>'

        # ── 6. Diario ────────────────────────────────────────────────────────
        UMORE_EMOJI = {
            'felice': '😊', 'sereno': '🙂', 'stanco': '😴',
            'agitato': '😤', 'triste': '😢',
        }
        righe_diario = ''
        for rd in diari:
            dow = rd.data.weekday()
            umore = UMORE_EMOJI.get(rd.umore, '') if rd.umore else ''
            sonno_str = ''
            if rd.sonno_inizio and rd.sonno_fine:
                sonno_str = f'💤 {rd.sonno_inizio.strftime("%H:%M")}–{rd.sonno_fine.strftime("%H:%M")}'
            popo_str = '🚽' if rd.popo else ''
            tags = ', '.join(he(t.nome) for t in rd.tags_cosa_portare.all())
            attivita = he(rd.attivita_descrizione or '')
            note = he(rd.note_giornata or '')
            extra = ' | '.join(x for x in [sonno_str, popo_str, tags] if x)
            righe_diario += (
                f'<tr><td class="data-col">{rd.data.day} {MESI_IT[rd.data.month]} {GIORNI_BREVE[dow]}</td>'
                f'<td>{umore}</td><td>{attivita}</td><td style="font-style:italic;color:#666">{note}</td>'
                f'<td style="font-size:7.5pt;color:#888">{extra}</td></tr>\n'
            )
        if not righe_diario:
            righe_diario = '<tr><td colspan="5" class="no-data">Nessun diario registrato nell\'ultimo anno.</td></tr>'

        # ── 7. Pasti ─────────────────────────────────────────────────────────
        header_portate = ''.join(f'<th>{lbl}</th>' for _, lbl in PORTATE)
        righe_pasti = ''
        for rp in pasti:
            dow = rp.data.weekday()
            celle = ''
            for campo, _ in PORTATE:
                val = getattr(rp, f'{campo}_quantita', '')
                celle += f'<td>{QUANTITA_LABEL.get(val, "—")}</td>' if val else '<td class="q-vuoto">—</td>'
            note_row = (
                f'<tr><td colspan="{len(PORTATE) + 1}" class="nota-pasto-cell">{he(rp.note_pasto)}</td></tr>'
                if rp.note_pasto else ''
            )
            righe_pasti += (
                f'<tr><td class="data-col">{rp.data.day} {MESI_IT[rp.data.month]} {GIORNI_BREVE[dow]}</td>'
                f'{celle}</tr>{note_row}\n'
            )
        if not righe_pasti:
            righe_pasti = f'<tr><td colspan="{len(PORTATE) + 1}" class="no-data">Nessun pasto registrato nell\'ultimo anno.</td></tr>'

        data_gen = tz.now().strftime('%d/%m/%Y alle %H:%M')

        html = f'''<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<style>
  @page {{ size: A4; margin: 1.5cm; }}
  body {{ font-family: Arial, sans-serif; font-size: 8.5pt; color: #222; line-height: 1.45; }}
  /* Header GDPR */
  .gdpr-header {{ background: linear-gradient(135deg, #2D3748, #4A5568); color: white;
    padding: 14px 20px; border-radius: 10px; margin-bottom: 12px; display: flex;
    justify-content: space-between; align-items: center; }}
  .gdpr-header .h1 {{ margin: 0; font-size: 16pt; font-weight: bold; }}
  .gdpr-header .sub {{ font-size: 8.5pt; opacity: 0.8; margin-top: 3px; }}
  .gdpr-badge {{ background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.4);
    border-radius: 8px; padding: 6px 12px; text-align: center; font-size: 8pt; font-weight: bold; }}
  /* Sezioni */
  h2 {{ font-size: 10.5pt; color: #2D3748; border-bottom: 2px solid #E2E8F0;
    padding-bottom: 3px; margin-top: 14px; margin-bottom: 6px; }}
  /* Tabella anagrafica key-value */
  .kv-table {{ width: 100%; border-collapse: collapse; margin-bottom: 8px; }}
  .kv-table th {{ background: #F7FAFC; color: #4A5568; text-align: left;
    padding: 4px 8px; border: 1px solid #E2E8F0; font-size: 7.5pt;
    font-weight: bold; width: 38%; }}
  .kv-table td {{ padding: 4px 8px; border: 1px solid #E2E8F0; font-size: 8pt; }}
  /* Tabelle dati */
  table.data-table {{ width: 100%; border-collapse: collapse; margin-top: 4px; }}
  table.data-table th {{ background: #EBF8FF; padding: 4px 5px; border: 1px solid #BEE3F8;
    font-size: 7.5pt; text-align: center; }}
  table.data-table td {{ padding: 3px 5px; border: 1px solid #EEE; font-size: 7.5pt; }}
  td.data-col {{ text-align: left; font-weight: bold; white-space: nowrap; }}
  .q-vuoto {{ color: #CCC; }}
  .nota-pasto-cell {{ font-style: italic; color: #888; font-size: 7pt; border-top: none; text-align: left; }}
  /* Avviso GDPR */
  .gdpr-notice {{ background: #FFFBEB; border: 1.5px solid #F6E05E; border-radius: 8px;
    padding: 8px 12px; margin-top: 14px; font-size: 7.5pt; color: #744210; }}
  .no-data {{ color: #AAA; font-style: italic; }}
  /* Footer */
  .footer {{ margin-top: 12px; font-size: 7pt; color: #AAA; border-top: 1px solid #EEE;
    padding-top: 6px; display: flex; justify-content: space-between; }}
  /* Page break */
  .page-break {{ page-break-before: always; }}
</style>
</head>
<body>

<div class="gdpr-header">
  <div>
    <div class="h1">📋 Export Dati Personali</div>
    <div class="sub">Ai sensi del Regolamento UE 2016/679 (GDPR) — Art. 20 Diritto alla portabilità</div>
    <div class="sub">Generato il {data_gen} — Richiedente: {he(user.get_full_name() or user.email)}</div>
  </div>
  <div class="gdpr-badge">GDPR<br>Art. 20</div>
</div>

<!-- 1. Anagrafica bambino -->
<h2>👶 Dati anagrafici — {nome_completo}</h2>
<table class="kv-table">
{righe_anag}
</table>

<!-- 2. Famiglia -->
<h2>👨‍👩‍👧 Nucleo familiare</h2>
<table class="kv-table">
{righe_fam}
</table>

<!-- 3. Deleghe ritiro -->
<h2>🤝 Deleghe di ritiro</h2>
<table class="data-table">
  <thead><tr><th>Nominativo</th><th>Telefono</th><th>Relazione</th><th>Stato</th></tr></thead>
  <tbody>{righe_deleghe}</tbody>
</table>

<!-- 4. Consensi fotografici -->
<h2>📸 Consensi fotografici (GDPR)</h2>
<table class="data-table">
  <thead><tr><th>Finalità</th><th>Stato</th><th>Data G1</th><th>Data G2</th></tr></thead>
  <tbody>{righe_consensi}</tbody>
</table>

<!-- 5. Presenze (ultimi 2 anni) -->
<h2 class="page-break">📅 Registro presenze (ultimi 2 anni — dal {fmt_date(due_anni_fa)})</h2>
<table class="data-table">
  <thead><tr><th>Data</th><th>Stato</th><th>Ora arrivo</th><th>Ora uscita</th></tr></thead>
  <tbody>{righe_presenze}</tbody>
</table>

<!-- 6. Diario (ultimo anno) -->
<h2 class="page-break">📔 Diario (ultimo anno — dal {fmt_date(anno_fa)})</h2>
<table class="data-table">
  <thead><tr><th>Data</th><th>😊</th><th style="text-align:left">Attività</th><th style="text-align:left">Note</th><th>Extra</th></tr></thead>
  <tbody>{righe_diario}</tbody>
</table>

<!-- 7. Pasti (ultimo anno) -->
<h2 class="page-break">🍽️ Registro pasti (ultimo anno — dal {fmt_date(anno_fa)})</h2>
<table class="data-table">
  <thead><tr><th>Data</th>{header_portate}</tr></thead>
  <tbody>{righe_pasti}</tbody>
</table>

<!-- Avviso GDPR -->
<div class="gdpr-notice">
  <strong>Informativa GDPR</strong> — I dati contenuti in questo documento sono trattati ai sensi del Regolamento UE 2016/679.
  Il titolare del trattamento è la scuola. I dati sono conservati secondo le policy di retention configurate nel sistema.
  Per esercitare i diritti di rettifica (Art. 16), cancellazione (Art. 17) o limitazione (Art. 18), contattare la direzione.
  Questo documento è riservato e non deve essere diffuso a terzi non autorizzati.
</div>

<div class="footer">
  <span>Sherazade — Portale scolastico — documento riservato</span>
  <span>Export generato il {data_gen}</span>
</div>
</body>
</html>'''

        pdf_bytes = HTML(string=html).write_pdf()
        safe = re.sub(r'[^\w\-]', '_', f'{bambino.cognome}_{bambino.nome}', flags=re.ASCII)
        nome_file = f'gdpr_export_{safe}_{oggi.strftime("%Y%m%d")}.pdf'
        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{nome_file}"'
        return resp


class FamigliaViewSet(LogAccessoMixin, viewsets.ModelViewSet):
    risorsa_nome = 'famiglia'
    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsDirigente()]

    def get_serializer_class(self):
        if self.action == 'create':
            return FamigliaCreateSerializer
        return FamigliaSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Famiglia.objects.select_related('bambino', 'genitore1', 'genitore2')
        if user.role == Role.GENITORE:
            return qs.filter(Q(genitore1=user) | Q(genitore2=user))
        if user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE):
            return qs.none()
        return qs

    def create(self, request, *args, **kwargs):
        serializer = FamigliaCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        famiglia = serializer.save()
        return Response(FamigliaSerializer(famiglia).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        """Supporta genitore2_email: risolve l'email a User ID (crea se non esiste), aggiorna nome/cognome se forniti."""
        instance = self.get_object()
        genitore2_email = request.data.get('genitore2_email')
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if genitore2_email:
            from apps.users.models import Role as UserRole
            try:
                g2 = User.objects.get(email__iexact=genitore2_email)
            except User.DoesNotExist:
                g2 = User(email=genitore2_email, username=genitore2_email, role=UserRole.GENITORE, is_active=True)
                g2.set_unusable_password()
                g2.save()
            # Aggiorna nome/cognome se forniti e non già presenti
            g2_nome = data.pop('genitore2_nome', None)
            g2_cognome = data.pop('genitore2_cognome', None)
            changed = False
            if g2_nome and not g2.first_name:
                g2.first_name = g2_nome if isinstance(g2_nome, str) else g2_nome[0]
                changed = True
            if g2_cognome and not g2.last_name:
                g2.last_name = g2_cognome if isinstance(g2_cognome, str) else g2_cognome[0]
                changed = True
            if changed:
                g2.save(update_fields=['first_name', 'last_name'])
            if g2.pk == instance.genitore1_id:
                return Response(
                    {'genitore2_email': 'Il genitore 2 non può essere lo stesso del genitore 1.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            data['genitore2'] = g2.id
            data.pop('genitore2_email', None)
        # Controllo anche su PATCH diretta con genitore1/genitore2 come ID
        g1_id = int(data.get('genitore1', instance.genitore1_id or 0))
        g2_id = data.get('genitore2')
        if g2_id and int(g2_id) == g1_id:
            return Response(
                {'genitore2': 'Il genitore 2 non può essere lo stesso del genitore 1.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = FamigliaSerializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(FamigliaSerializer(instance).data)


class DelegaRitiroViewSet(LogAccessoMixin, viewsets.ModelViewSet):
    risorsa_nome = 'delega_ritiro'
    serializer_class = DelegaRitiroSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsDirigente()]

    def get_queryset(self):
        user = self.request.user
        qs = DelegaRitiro.objects.select_related('bambino')
        if user.role == Role.GENITORE:
            return qs.filter(
                Q(bambino__famiglia__genitore1=user) | Q(bambino__famiglia__genitore2=user)
            )
        if user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE):
            return qs.none()
        return qs
