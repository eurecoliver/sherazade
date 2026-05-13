from datetime import date

from django.db import IntegrityError
from django.db.models import Q, Prefetch
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.children.models import Bambino
from apps.users.models import Role
from apps.audit.mixin import LogAccessoMixin
from .models import (
    AllergiaIntolleranza, MenuGiornaliero, RegistroPasto,
    ConfigMenuCiclo, Piatto, PiattoAssegnazione, SostituzionePiatto,
)
from .permissions import AllergiaPermission, MenuPermission, RegistroPastoPermission
from .serializers import (
    AllergiaIntolleranzaSerializer,
    MenuGiornalieroSerializer,
    RegistroPastoSerializer,
    RegistroPastoWriteSerializer,
    ConfigMenuCicloSerializer,
    PiattoSerializer,
    PiattoAssegnazioneSerializer,
    SostituzionePiattoSerializer,
)


class AllergiaIntolleranzaViewSet(LogAccessoMixin, viewsets.ModelViewSet):
    risorsa_nome = 'allergia'
    serializer_class = AllergiaIntolleranzaSerializer
    permission_classes = [IsAuthenticated, AllergiaPermission]

    def get_queryset(self):
        user = self.request.user
        qs = AllergiaIntolleranza.objects.select_related(
            'bambino__famiglia__genitore1',
            'bambino__famiglia__genitore2',
        )
        if user.role == Role.GENITORE:
            return qs.filter(
                Q(bambino__famiglia__genitore1=user)
                | Q(bambino__famiglia__genitore2=user)
            )
        return qs

    @action(detail=False, methods=['get'])
    def per_sezione(self, request):
        gruppo = request.query_params.get('gruppo', '')
        bambini_qs = (
            Bambino.objects
            .filter(attivo=True)
            .select_related('gruppo')
            .prefetch_related(
                Prefetch(
                    'allergie',
                    queryset=AllergiaIntolleranza.objects.filter(attivo=True).order_by('-gravita'),
                )
            )
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo)

        result = []
        for b in bambini_qs:
            allergie = b.allergie.all()
            result.append({
                'id': b.id,
                'nome': b.nome,
                'cognome': b.cognome,
                'sezione': b.sezione,
                'allergie': AllergiaIntolleranzaSerializer(allergie, many=True).data,
                'ha_allergie_gravi': any(
                    a.gravita in (
                        AllergiaIntolleranza.Gravita.GRAVE,
                        AllergiaIntolleranza.Gravita.ANAFILASSI,
                    ) for a in allergie
                ),
            })

        return Response(result)


class MenuGiornalieroViewSet(viewsets.ModelViewSet):
    serializer_class = MenuGiornalieroSerializer
    permission_classes = [IsAuthenticated, MenuPermission]

    def get_queryset(self):
        qs = MenuGiornaliero.objects.select_related('inserito_da')
        params = self.request.query_params
        if data := params.get('data'):
            qs = qs.filter(data=data)
        if sezione := params.get('sezione'):
            qs = qs.filter(sezione=sezione)
        return qs

    def perform_create(self, serializer):
        serializer.save(inserito_da=self.request.user)

    @action(detail=False, methods=['get'])
    def oggi(self, request):
        sezione = request.query_params.get('sezione', '')
        qs = MenuGiornaliero.objects.filter(data=date.today()).select_related('inserito_da')
        if sezione:
            qs = qs.filter(sezione=sezione)
        return Response(MenuGiornalieroSerializer(qs, many=True).data)


class RegistroPastoViewSet(LogAccessoMixin, viewsets.ModelViewSet):
    risorsa_nome = 'registro_pasto'
    permission_classes = [IsAuthenticated, RegistroPastoPermission]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return RegistroPastoWriteSerializer
        return RegistroPastoSerializer

    def get_queryset(self):
        user = self.request.user
        qs = RegistroPasto.objects.select_related(
            'bambino__famiglia__genitore1',
            'bambino__famiglia__genitore2',
            'compilato_da',
        )
        if user.role == Role.GENITORE:
            return qs.filter(
                Q(bambino__famiglia__genitore1=user)
                | Q(bambino__famiglia__genitore2=user)
            )
        params = self.request.query_params
        if bambino_id := params.get('bambino'):
            qs = qs.filter(bambino_id=bambino_id)
        if data := params.get('data'):
            qs = qs.filter(data=data)
        if gruppo := params.get('gruppo'):
            qs = qs.filter(bambino__gruppo_id=gruppo)
        return qs

    def perform_create(self, serializer):
        serializer.save(compilato_da=self.request.user)

    @action(detail=False, methods=['get'])
    def giornata(self, request):
        data_str = request.query_params.get('data', str(date.today()))
        gruppo = request.query_params.get('gruppo', '')

        bambini_qs = (
            Bambino.objects
            .filter(attivo=True)
            .select_related('gruppo')
            .prefetch_related(
                Prefetch(
                    'allergie',
                    queryset=AllergiaIntolleranza.objects.filter(attivo=True).order_by('-gravita'),
                )
            )
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo)

        registri = {
            r.bambino_id: r
            for r in RegistroPasto.objects.filter(data=data_str).select_related('compilato_da')
        }

        result = []
        for b in bambini_qs:
            allergie = b.allergie.all()
            registro = registri.get(b.id)
            result.append({
                'bambino': {
                    'id': b.id,
                    'nome': b.nome,
                    'cognome': b.cognome,
                    'sezione': b.sezione,
                    'gruppo_id': b.gruppo_id,
                    'allergie': AllergiaIntolleranzaSerializer(allergie, many=True).data,
                    'ha_allergie_gravi': any(
                        a.gravita in (
                            AllergiaIntolleranza.Gravita.GRAVE,
                            AllergiaIntolleranza.Gravita.ANAFILASSI,
                        ) for a in allergie
                    ),
                },
                'registro': RegistroPastoSerializer(registro).data if registro else None,
            })

        return Response(result)

    @action(detail=False, methods=['post'])
    def salva_sezione(self, request):
        data_str = request.data.get('data', str(date.today()))
        pasti = request.data.get('pasti', [])
        if not isinstance(pasti, list):
            return Response({'detail': 'Campo "pasti" deve essere una lista.'}, status=status.HTTP_400_BAD_REQUEST)

        CAMPI_QUANTITA = (
            'colazione_quantita', 'primo_quantita', 'secondo_quantita',
            'monopiatto_quantita', 'contorno_quantita', 'pane_quantita',
            'frutta_quantita', 'merenda_quantita',
        )

        saved, errors = [], []
        for item in pasti:
            bambino_id = item.get('bambino')
            if not bambino_id:
                continue
            defaults = {campo: item.get(campo, '') for campo in CAMPI_QUANTITA}
            defaults['note_pasto'] = item.get('note_pasto', '')
            defaults['compilato_da'] = request.user
            try:
                obj, _ = RegistroPasto.objects.update_or_create(
                    bambino_id=bambino_id,
                    data=data_str,
                    defaults=defaults,
                )
                saved.append(obj.id)
            except Exception as e:
                errors.append({'bambino': bambino_id, 'errore': str(e)})

        return Response({'salvati': len(saved), 'errori': errors}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def mio_figlio(self, request):
        if request.user.role != Role.GENITORE:
            return Response({'detail': 'Riservato ai genitori.'}, status=status.HTTP_403_FORBIDDEN)

        bambino_id = request.query_params.get('bambino')
        user = request.user

        if not bambino_id:
            registri = (
                RegistroPasto.objects
                .filter(
                    Q(bambino__famiglia__genitore1=user)
                    | Q(bambino__famiglia__genitore2=user)
                )
                .select_related('compilato_da')
                .order_by('-data')
            )
            return Response(RegistroPastoSerializer(registri, many=True).data)

        try:
            bambino = Bambino.objects.select_related(
                'famiglia__genitore1', 'famiglia__genitore2'
            ).get(id=bambino_id)
        except Bambino.DoesNotExist:
            return Response({'detail': 'Bambino non trovato.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            famiglia = bambino.famiglia
            autorizzato = (
                famiglia.genitore1_id == user.pk
                or famiglia.genitore2_id == user.pk
            )
        except Exception:
            registri = (
                RegistroPasto.objects
                .filter(
                    Q(bambino__famiglia__genitore1=user)
                    | Q(bambino__famiglia__genitore2=user)
                )
                .select_related('compilato_da')
                .order_by('-data')
            )
            return Response(RegistroPastoSerializer(registri, many=True).data)

        if not autorizzato:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        registri = (
            RegistroPasto.objects
            .filter(bambino_id=bambino_id)
            .select_related('compilato_da')
            .order_by('-data')
        )
        return Response(RegistroPastoSerializer(registri, many=True).data)


# ── Menu ciclico v2 ──────────────────────────────────────────────────────────

class ConfigMenuCicloViewSet(viewsets.ViewSet):
    """Singleton: GET restituisce la config, POST la crea/aggiorna."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        try:
            cfg = ConfigMenuCiclo.objects.get()
            return Response(ConfigMenuCicloSerializer(cfg).data)
        except ConfigMenuCiclo.DoesNotExist:
            return Response(None)

    def create(self, request):
        if request.user.role not in (Role.ADMIN, Role.DIRETTRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            cfg = ConfigMenuCiclo.objects.get()
            serializer = ConfigMenuCicloSerializer(cfg, data=request.data, partial=True)
        except ConfigMenuCiclo.DoesNotExist:
            serializer = ConfigMenuCicloSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(aggiornato_da=request.user)
        return Response(serializer.data)


class PiattoViewSet(viewsets.ModelViewSet):
    serializer_class = PiattoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Piatto.objects.all()
        if tipo := self.request.query_params.get('tipo'):
            qs = qs.filter(tipo=tipo)
        if self.request.user.role == Role.GENITORE:
            qs = qs.filter(attivo=True)
        attivo = self.request.query_params.get('attivo')
        if attivo is not None:
            qs = qs.filter(attivo=attivo.lower() == 'true')
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.CUOCA):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Non autorizzato.')
        serializer.save(creato_da=self.request.user)

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in (Role.ADMIN, Role.DIRETTRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        piatto = self.get_object()
        piatto.attivo = False
        piatto.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def menu_giorno(self, request):
        """
        Calcola il menu del giorno per un gruppo dal ciclo configurato.
        Parametri: data (default oggi), gruppo (obbligatorio)
        """
        data_str = request.query_params.get('data', str(date.today()))
        gruppo_id = request.query_params.get('gruppo')

        try:
            from datetime import date as date_cls
            data = date_cls.fromisoformat(data_str)
        except ValueError:
            return Response({'detail': 'Data non valida.'}, status=status.HTTP_400_BAD_REQUEST)

        if not gruppo_id:
            return Response({'detail': 'Parametro "gruppo" obbligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        settimana = ConfigMenuCiclo.settimana_ciclo(data)
        weekday = data.weekday()  # 0=lunedì, 4=venerdì

        assegnazioni = (
            PiattoAssegnazione.objects
            .filter(gruppi__id=gruppo_id, piatto__attivo=True)
            .select_related('piatto')
            .prefetch_related('gruppi')
        )

        ciclo: dict = {}
        for asseg in assegnazioni:
            if asseg.sempre:
                ciclo.setdefault(asseg.piatto.tipo, []).append(PiattoSerializer(asseg.piatto).data)
            elif settimana is not None:
                giorni = asseg.giorni_per_settimana.get(str(settimana), [])
                if weekday in giorni:
                    ciclo.setdefault(asseg.piatto.tipo, []).append(PiattoSerializer(asseg.piatto).data)

        sostituzioni = list(
            SostituzionePiatto.objects
            .filter(data=data)
            .filter(Q(gruppi__id=gruppo_id) | Q(gruppi__isnull=True))
            .distinct()
            .prefetch_related('gruppi')
        )

        piatti_finali = dict(ciclo)
        for sost in sostituzioni:
            piatti_finali[sost.tipo] = [{
                'id': None,
                'descrizione': sost.descrizione,
                'tipo': sost.tipo,
                'tipo_label': sost.get_tipo_display(),
                'note': sost.note,
                'attivo': True,
                'is_sostituzione': True,
                'sostituzione_id': sost.id,
            }]

        for t in [c.value for c in Piatto.Tipo]:
            piatti_finali.setdefault(t, [])

        return Response({
            'data': data_str,
            'gruppo_id': int(gruppo_id),
            'settimana_ciclo': settimana,
            'piatti': piatti_finali,
            'sostituzioni_raw': SostituzionePiattoSerializer(sostituzioni, many=True).data,
        })

    @action(detail=False, methods=['get'], url_path='export-pdf-menu')
    def export_pdf_menu(self, request):
        """
        Esporta PDF menu settimanale per tutti i gruppi.
        Parametri: data (default lunedì corrente).
        Accessibile a tutti gli utenti autenticati.
        """
        from django.http import HttpResponse
        from weasyprint import HTML
        from apps.config.models import Gruppo
        import calendar as cal_mod
        from datetime import timedelta

        data_str = request.query_params.get('data', str(date.today()))
        try:
            data_richiesta = date.fromisoformat(data_str)
        except ValueError:
            return Response({'detail': 'Data non valida.'}, status=status.HTTP_400_BAD_REQUEST)

        # Vai al lunedì della settimana richiesta
        lunedi = data_richiesta - timedelta(days=data_richiesta.weekday())
        giorni_settimana = [lunedi + timedelta(days=i) for i in range(5)]  # lun-ven

        GIORNI_IT = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']
        TIPO_ORDER = ['primo', 'secondo', 'contorno', 'frutta', 'merenda', 'altro']
        TIPO_LABEL = {
            'primo': 'Primo', 'secondo': 'Secondo', 'contorno': 'Contorno',
            'frutta': 'Frutta', 'merenda': 'Merenda', 'altro': 'Altro',
        }

        gruppi = Gruppo.objects.filter(attivo=True).order_by('ordine')

        def get_piatti_giorno(gruppo_id, data):
            settimana = ConfigMenuCiclo.settimana_ciclo(data)
            weekday = data.weekday()
            assegnazioni = (
                PiattoAssegnazione.objects
                .filter(gruppi__id=gruppo_id, piatto__attivo=True)
                .select_related('piatto')
            )
            ciclo: dict = {}
            for asseg in assegnazioni:
                if asseg.sempre:
                    ciclo.setdefault(asseg.piatto.tipo, []).append(asseg.piatto.descrizione)
                elif settimana is not None:
                    giorni = asseg.giorni_per_settimana.get(str(settimana), [])
                    if weekday in giorni:
                        ciclo.setdefault(asseg.piatto.tipo, []).append(asseg.piatto.descrizione)
            sostituzioni = SostituzionePiatto.objects.filter(data=data).filter(
                Q(gruppi__id=gruppo_id) | Q(gruppi__isnull=True)
            ).distinct()
            for s in sostituzioni:
                ciclo[s.tipo] = [s.descrizione]
            return ciclo

        # Costruisci tabella: righe = tipo piatto, colonne = giorni
        intestazione = ''.join(f'<th>{g_it}<br><small>{g.strftime("%d/%m")}</small></th>'
                               for g_it, g in zip(GIORNI_IT, giorni_settimana))

        gruppi_html = ''
        for g in gruppi:
            righe_tipo = ''
            for tipo in TIPO_ORDER:
                celle = ''
                for data_g in giorni_settimana:
                    piatti = get_piatti_giorno(g.id, data_g).get(tipo, [])
                    testo = ', '.join(piatti) if piatti else '—'
                    celle += f'<td>{testo}</td>'
                righe_tipo += f'<tr><td class="tipo">{TIPO_LABEL.get(tipo, tipo)}</td>{celle}</tr>'

            gruppi_html += f'''
            <div class="gruppo-header" style="background:{g.colore}20; border-left:4px solid {g.colore}">
              <strong>{g.nome}</strong>
            </div>
            <table>
              <thead>
                <tr><th class="tipo-h"></th>{intestazione}</tr>
              </thead>
              <tbody>{righe_tipo}</tbody>
            </table>
            '''

        settimana_num = ConfigMenuCiclo.settimana_ciclo(lunedi)
        sett_label = f'Settimana ciclo {settimana_num}' if settimana_num else 'Settimana ciclo non configurata'
        dal = lunedi.strftime('%d/%m/%Y')
        al = giorni_settimana[-1].strftime('%d/%m/%Y')
        from django.utils import timezone as tz
        stampa = tz.now().strftime('%d/%m/%Y %H:%M')

        html = f'''<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<style>
  @page {{ size: A4 landscape; margin: 1.5cm; }}
  body {{ font-family: Arial, sans-serif; font-size: 9pt; color: #222; }}
  h1 {{ font-size: 14pt; color: #E67E22; margin-bottom: 0.1cm; }}
  .meta {{ font-size: 8pt; color: #888; margin-bottom: 0.6cm; }}
  .gruppo-header {{ padding: 5px 10px; margin: 0.4cm 0 0.1cm; font-size: 10pt; border-radius: 4px; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 0.3cm; }}
  th {{ background: #FFF9E6; padding: 4px 8px; border: 1px solid #FED7AA; font-size: 8.5pt; text-align: center; }}
  th.tipo-h {{ width: 1.8cm; }}
  td {{ padding: 3px 6px; border: 1px solid #EEE; font-size: 8.5pt; vertical-align: top; }}
  td.tipo {{ font-weight: bold; color: #E67E22; background: #FFF9E6; white-space: nowrap; }}
  .footer {{ margin-top: 0.5cm; font-size: 7.5pt; color: #aaa; border-top: 1px solid #EEE; padding-top: 0.2cm; }}
</style>
</head>
<body>
<h1>🍽 Menu Settimanale — dal {dal} al {al}</h1>
<div class="meta">{sett_label} &nbsp;|&nbsp; Stampa: {stampa}</div>
{gruppi_html}
<div class="footer">Generato da Sherazade</div>
</body>
</html>'''

        pdf_bytes = HTML(string=html).write_pdf()
        filename = f'menu_{lunedi.strftime("%Y_%m_%d")}.pdf'
        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        return resp


class PiattoAssegnazioneViewSet(viewsets.ModelViewSet):
    serializer_class = PiattoAssegnazioneSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PiattoAssegnazione.objects.select_related('piatto').prefetch_related('gruppi')
        if gruppo := self.request.query_params.get('gruppo'):
            qs = qs.filter(gruppi__id=gruppo)
        if tipo := self.request.query_params.get('tipo'):
            qs = qs.filter(piatto__tipo=tipo)
        return qs

    def create(self, request, *args, **kwargs):
        if request.user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class SostituzionePiattoViewSet(viewsets.ModelViewSet):
    serializer_class = SostituzionePiattoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = SostituzionePiatto.objects.prefetch_related('gruppi')
        if data := self.request.query_params.get('data'):
            qs = qs.filter(data=data)
        if gruppo := self.request.query_params.get('gruppo'):
            qs = qs.filter(Q(gruppi__id=gruppo) | Q(gruppi__isnull=True)).distinct()
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Non autorizzato.')
        serializer.save(inserito_da=self.request.user)

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)
