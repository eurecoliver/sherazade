from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.children.models import Bambino
from apps.users.models import Role
from apps.consents.permissions import ConsensoPermission
from .models import ConsensoFotografico
from .serializers import ConsensoFotograficoSerializer


def _calcola_stato(c, has_g2, non_fotografabile):
    if non_fotografabile:
        return 'non_fotografabile'
    if c.revocato:
        return 'revocato'
    if has_g2:
        if c.consenso_genitore1 and c.consenso_genitore2:
            return 'completo'
        if c.consenso_genitore1 or c.consenso_genitore2:
            return 'parziale'
    else:
        if c.consenso_genitore1:
            return 'completo'
    return 'nessuno'


class ConsensoFotograficoViewSet(viewsets.ModelViewSet):
    serializer_class = ConsensoFotograficoSerializer
    permission_classes = [IsAuthenticated, ConsensoPermission]

    def get_queryset(self):
        user = self.request.user
        qs = ConsensoFotografico.objects.select_related(
            'bambino__famiglia__genitore1',
            'bambino__famiglia__genitore2',
        )
        if user.role == Role.GENITORE:
            return qs.filter(
                Q(bambino__famiglia__genitore1=user)
                | Q(bambino__famiglia__genitore2=user)
            )
        if user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE):
            return qs.none()
        return qs

    # ── Custom actions ────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def stato(self, request):
        """Riepilogo per admin: lista bambini con stato consensi per finalità."""
        bambini = (
            Bambino.objects
            .filter(attivo=True)
            .select_related('famiglia__genitore1', 'famiglia__genitore2')
            .prefetch_related('consensi')
            .order_by('cognome', 'nome')
        )

        result = []
        for b in bambini:
            try:
                has_g2 = b.famiglia is not None and b.famiglia.genitore2 is not None
            except Exception:
                has_g2 = False

            consensi_map = {c.finalita: c for c in b.consensi.all()}
            consensi = {}

            for val, _label in ConsensoFotografico.Finalita.choices:
                c = consensi_map.get(val)
                if c is None:
                    consensi[val] = {
                        'id': None,
                        'stato': 'non_fotografabile' if b.non_fotografabile else 'nessuno',
                        'consenso_genitore1': False,
                        'consenso_genitore2': None,
                        'data_consenso_genitore1': None,
                        'data_consenso_genitore2': None,
                        'revocato': False,
                        'data_revoca': None,
                        'note': '',
                    }
                else:
                    consensi[val] = {
                        'id': c.id,
                        'stato': _calcola_stato(c, has_g2, b.non_fotografabile),
                        'consenso_genitore1': c.consenso_genitore1,
                        'consenso_genitore2': c.consenso_genitore2 if has_g2 else None,
                        'data_consenso_genitore1': c.data_consenso_genitore1,
                        'data_consenso_genitore2': c.data_consenso_genitore2 if has_g2 else None,
                        'revocato': c.revocato,
                        'data_revoca': c.data_revoca,
                        'note': c.note,
                    }

            result.append({
                'id': b.id,
                'nome': b.nome,
                'cognome': b.cognome,
                'non_fotografabile': b.non_fotografabile,
                'ha_famiglia': hasattr(b, 'famiglia') and b.famiglia is not None,
                'has_genitore2': has_g2,
                'consensi': consensi,
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def miei(self, request):
        """Genitore: stato consensi per i propri figli."""
        if request.user.role != Role.GENITORE:
            return Response({'detail': 'Riservato ai genitori.'}, status=status.HTTP_403_FORBIDDEN)

        user = request.user
        figli = (
            Bambino.objects
            .filter(Q(famiglia__genitore1=user) | Q(famiglia__genitore2=user))
            .select_related('famiglia__genitore1', 'famiglia__genitore2')
            .prefetch_related('consensi')
            .order_by('cognome', 'nome')
        )

        result = []
        for b in figli:
            try:
                is_genitore2 = b.famiglia.genitore2 == user
            except Exception:
                is_genitore2 = False

            consensi = []
            for val, label in ConsensoFotografico.Finalita.choices:
                try:
                    c = b.consensi.get(finalita=val)
                    mio_consenso = c.consenso_genitore2 if is_genitore2 else c.consenso_genitore1
                    mia_data = c.data_consenso_genitore2 if is_genitore2 else c.data_consenso_genitore1
                    consenso_id = c.id
                    revocato = c.revocato
                    data_revoca = c.data_revoca
                except ConsensoFotografico.DoesNotExist:
                    mio_consenso = False
                    mia_data = None
                    consenso_id = None
                    revocato = False
                    data_revoca = None

                consensi.append({
                    'id': consenso_id,
                    'finalita': val,
                    'finalita_label': label,
                    'mio_consenso': bool(mio_consenso),
                    'mia_data_consenso': mia_data,
                    'revocato': revocato,
                    'data_revoca': data_revoca,
                })

            result.append({
                'id': b.id,
                'nome': b.nome,
                'cognome': b.cognome,
                'non_fotografabile': b.non_fotografabile,
                'is_genitore2': is_genitore2,
                'consensi': consensi,
            })

        return Response(result)

    @action(detail=True, methods=['post'])
    def dai_consenso(self, request, pk=None):
        """Genitore dà il proprio consenso. Admin imposta entrambi."""
        c = self.get_object()
        user = request.user
        now = timezone.now()

        if user.role == Role.GENITORE:
            try:
                if c.bambino.famiglia.genitore1 == user:
                    c.consenso_genitore1 = True
                    c.data_consenso_genitore1 = now
                elif c.bambino.famiglia.genitore2 == user:
                    c.consenso_genitore2 = True
                    c.data_consenso_genitore2 = now
                else:
                    return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({'detail': 'Famiglia non trovata.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Admin/Direttrice: imposta genitore1; genitore2 se presente
            c.consenso_genitore1 = True
            c.data_consenso_genitore1 = now
            try:
                if c.bambino.famiglia.genitore2 is not None:
                    c.consenso_genitore2 = True
                    c.data_consenso_genitore2 = now
            except Exception:
                pass

        c.save()
        return Response(ConsensoFotograficoSerializer(c).data)

    @action(detail=True, methods=['post'])
    def revoca_consenso(self, request, pk=None):
        """Genitore revoca il proprio consenso. Admin revoca il record intero."""
        c = self.get_object()
        user = request.user
        now = timezone.now()

        if user.role == Role.GENITORE:
            try:
                if c.bambino.famiglia.genitore1 == user:
                    c.consenso_genitore1 = False
                    c.data_consenso_genitore1 = None
                elif c.bambino.famiglia.genitore2 == user:
                    c.consenso_genitore2 = False
                    c.data_consenso_genitore2 = None
                else:
                    return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({'detail': 'Famiglia non trovata.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            c.revocato = True
            c.data_revoca = now

        c.save()
        return Response(ConsensoFotograficoSerializer(c).data)

    @action(detail=True, methods=['post'])
    def riabilita_consenso(self, request, pk=None):
        """Admin/Direttrice: riabilita un consenso revocato."""
        from apps.users.models import Role
        if request.user.role not in (Role.ADMIN, Role.DIRETTRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        c = self.get_object()
        c.revocato = False
        c.data_revoca = None
        c.save()
        return Response(ConsensoFotograficoSerializer(c).data)

    @action(detail=False, methods=['post'])
    def revoca_tutti(self, request):
        """Admin: revoca tutti i consensi di un bambino."""
        bambino_id = request.data.get('bambino')
        if not bambino_id:
            return Response({'detail': 'Campo "bambino" obbligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        now = timezone.now()
        count = ConsensoFotografico.objects.filter(bambino_id=bambino_id).update(
            revocato=True,
            data_revoca=now,
        )
        return Response({'revocati': count})

    @action(detail=False, methods=['get'])
    def pdf(self, request):
        """Admin/Direttrice/Genitore: genera PDF riepilogo consensi per un bambino."""
        from django.http import HttpResponse
        from weasyprint import HTML
        from apps.children.models import Bambino

        role = request.user.role
        is_staff = role in (Role.ADMIN, Role.DIRETTRICE)
        is_genitore = role == Role.GENITORE

        if not is_staff and not is_genitore:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        bambino_id = request.query_params.get('bambino')
        if not bambino_id:
            return Response({'detail': 'Parametro "bambino" obbligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            bambino = Bambino.objects.select_related(
                'famiglia__genitore1', 'famiglia__genitore2'
            ).prefetch_related('consensi').get(id=bambino_id)
        except Bambino.DoesNotExist:
            return Response({'detail': 'Bambino non trovato.'}, status=status.HTTP_404_NOT_FOUND)

        # Genitore: può accedere solo ai propri figli
        if is_genitore:
            user = request.user
            try:
                fam = bambino.famiglia
                if fam.genitore1_id != user.pk and fam.genitore2_id != user.pk:
                    return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            g1 = bambino.famiglia.genitore1
            g1_nome = g1.get_full_name() or g1.email
        except Exception:
            g1_nome = '—'
        try:
            g2 = bambino.famiglia.genitore2
            g2_nome = g2.get_full_name() or g2.email if g2 else None
        except Exception:
            g2_nome = None

        consensi_map = {c.finalita: c for c in bambino.consensi.all()}

        FINALITA_INFO = [
            ('uso_interno',          'Uso interno (solo staff)',               'Le fotografie vengono utilizzate esclusivamente a fini educativi interni, visibili solo al personale della scuola.'),
            ('genitori_diretti',     'Visibile ai genitori del bambino',       'Le fotografie vengono condivise esclusivamente con i genitori/tutori del bambino attraverso il portale sicuro della scuola.'),
            ('newsletter_scolastica','Newsletter scolastica',                   'Le fotografie possono essere utilizzate nelle comunicazioni ufficiali della scuola (newsletter, avvisi agli iscritti).'),
        ]

        def fmt_dt(dt):
            if not dt:
                return ''
            import datetime
            if isinstance(dt, datetime.datetime):
                return dt.strftime('%d/%m/%Y %H:%M')
            return str(dt)

        righe = ''
        for finalita, label, desc in FINALITA_INFO:
            c = consensi_map.get(finalita)
            if c:
                g1_ok = c.consenso_genitore1
                g1_data = fmt_dt(c.data_consenso_genitore1)
                g2_ok = c.consenso_genitore2 if g2_nome else None
                g2_data = fmt_dt(c.data_consenso_genitore2) if g2_nome else ''
                revocato = c.revocato
                stato_str = '🔴 REVOCATO' if revocato else ('🟢 Completo' if (g1_ok and (g2_ok or not g2_nome)) else ('🟡 Parziale' if (g1_ok or g2_ok) else '🔴 Non dato'))
            else:
                g1_ok = False
                g1_data = ''
                g2_ok = None
                g2_data = ''
                revocato = False
                stato_str = '🔴 Non configurato'

            def chk(val):
                return '<span class="check yes">✓</span>' if val else '<span class="check no">○</span>'

            g2_row = f'<tr><td class="sub">Genitore 2 — {g2_nome}</td><td>{chk(g2_ok)}</td><td class="date">{g2_data}</td></tr>' if g2_nome is not None else ''

            righe += f'''
            <tr class="section-header">
              <td colspan="3"><strong>{label}</strong><br><small>{desc}</small></td>
            </tr>
            <tr>
              <td class="sub">Genitore 1 — {g1_nome}</td>
              <td>{chk(g1_ok)}</td>
              <td class="date">{g1_data}</td>
            </tr>
            {g2_row}
            <tr class="stato-row">
              <td colspan="3" class="stato">Stato: {stato_str}</td>
            </tr>
            '''

        from django.utils import timezone as tz
        oggi = tz.now().strftime('%d/%m/%Y %H:%M')

        html_content = f'''<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<style>
  @page {{ size: A4; margin: 2cm; }}
  body {{ font-family: Arial, sans-serif; font-size: 10pt; color: #222; }}
  h1 {{ font-size: 16pt; color: #E8562A; margin-bottom: 0.2cm; }}
  h2 {{ font-size: 12pt; color: #444; margin-bottom: 0.5cm; font-weight: normal; }}
  .meta {{ background: #FFF8F4; border: 1px solid #FFD4B3; border-radius: 4px; padding: 0.4cm 0.5cm; margin-bottom: 0.6cm; font-size: 9pt; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 0.3cm; }}
  th {{ background: #FFE8D6; text-align: left; padding: 5px 8px; font-size: 9pt; border: 1px solid #FFD4B3; }}
  td {{ padding: 5px 8px; border: 1px solid #EEDDCC; vertical-align: top; }}
  tr.section-header td {{ background: #FFF3EE; font-size: 9.5pt; padding: 6px 8px; border-top: 2px solid #FFD4B3; }}
  tr.section-header small {{ color: #888; font-size: 8pt; }}
  td.sub {{ padding-left: 1.2cm; font-size: 9pt; color: #444; }}
  td.date {{ font-size: 8pt; color: #888; white-space: nowrap; }}
  td.stato {{ font-size: 8.5pt; color: #555; font-style: italic; background: #FAFAFA; }}
  tr.stato-row td {{ border-bottom: 2px solid #FFD4B3; }}
  .check {{ font-size: 11pt; font-weight: bold; }}
  .check.yes {{ color: #27AE60; }}
  .check.no {{ color: #C0392B; }}
  .footer {{ margin-top: 1cm; font-size: 8pt; color: #aaa; border-top: 1px solid #EEE; padding-top: 0.3cm; }}
  .non-fot {{ background: #333; color: white; padding: 2px 8px; border-radius: 3px; font-size: 9pt; }}
</style>
</head>
<body>
<h1>📷 Modulo Consensi Fotografici</h1>
<h2>Scuola Sherazade — riepilogo per la famiglia</h2>

<div class="meta">
  <strong>Bambino:</strong> {bambino.nome} {bambino.cognome}
  {"&nbsp;&nbsp;<span class='non-fot'>⚫ NON FOTOGRAFABILE</span>" if bambino.non_fotografabile else ""}
  &nbsp;&nbsp;&nbsp;
  <strong>Data stampa:</strong> {oggi}
</div>

<table>
  <thead>
    <tr>
      <th style="width:55%">Finalità</th>
      <th style="width:10%">Consenso</th>
      <th style="width:35%">Data firma</th>
    </tr>
  </thead>
  <tbody>
    {righe}
  </tbody>
</table>

<div class="footer">
  Documento generato automaticamente dal sistema Sherazade. I dati sono trattati nel rispetto del GDPR (Reg. UE 2016/679).
  I consensi possono essere revocati in qualsiasi momento contattando la scuola o tramite il portale genitore.
</div>
</body>
</html>'''

        pdf_bytes = HTML(string=html_content).write_pdf()
        filename = f"consensi_{bambino.cognome}_{bambino.nome}.pdf".replace(' ', '_')
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
