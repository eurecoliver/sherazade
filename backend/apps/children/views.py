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
