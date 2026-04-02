import calendar
from datetime import date

from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.children.models import Bambino
from apps.users.models import Role
from .models import Presenza
from .permissions import PresenzaPermission
from .serializers import PresenzaSerializer, PresenzaWriteSerializer


class PresenzaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, PresenzaPermission]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return PresenzaWriteSerializer
        return PresenzaSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Presenza.objects.select_related(
            'bambino__famiglia__genitore1',
            'bambino__famiglia__genitore2',
            'registrato_da',
        )
        if user.role == Role.GENITORE:
            return qs.filter(
                Q(bambino__famiglia__genitore1=user)
                | Q(bambino__famiglia__genitore2=user)
            )
        params = self.request.query_params
        if bambino_id := params.get('bambino'):
            qs = qs.filter(bambino_id=bambino_id)
        if data_param := params.get('data'):
            qs = qs.filter(data=data_param)
        if gruppo := params.get('gruppo'):
            qs = qs.filter(bambino__gruppo_id=gruppo)
        return qs

    def perform_create(self, serializer):
        serializer.save(registrato_da=self.request.user)

    def perform_update(self, serializer):
        serializer.save(registrato_da=self.request.user)

    # ─── Staff/Admin ──────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def giornata(self, request):
        """
        Staff/Admin: lista bambini con la loro presenza del giorno.
        Parametri: data (default oggi), sezione (opzionale).
        """
        data_str = request.query_params.get('data', str(date.today()))
        gruppo = request.query_params.get('gruppo', '')

        bambini_qs = (
            Bambino.objects
            .filter(attivo=True)
            .select_related('gruppo', 'orario_uscita')
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo)

        presenze = {
            p.bambino_id: p
            for p in Presenza.objects.filter(data=data_str).select_related('registrato_da')
        }

        result = []
        for b in bambini_qs:
            presenza = presenze.get(b.id)
            orario_uscita_previsto = None
            try:
                if b.orario_uscita:
                    orario_uscita_previsto = b.orario_uscita.orario.strftime('%H:%M')
            except Exception:
                pass
            result.append({
                'bambino': {
                    'id': b.id,
                    'nome': b.nome,
                    'cognome': b.cognome,
                    'sezione': b.sezione,
                    'orario_uscita_previsto': orario_uscita_previsto,
                },
                'presenza': PresenzaSerializer(presenza).data if presenza else None,
            })

        return Response(result)

    @action(detail=False, methods=['post'])
    def salva_giornata(self, request):
        """
        Salva (crea o aggiorna) le presenze di tutti i bambini in un unico POST.
        Body: { data: "YYYY-MM-DD", presenze: [ { bambino, presente, ora_arrivo, motivo_assenza, note }, ... ] }
        """
        data_str = request.data.get('data', str(date.today()))
        presenze_data = request.data.get('presenze', [])
        if not isinstance(presenze_data, list):
            return Response(
                {'detail': 'Campo "presenze" deve essere una lista.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        saved, errors = [], []
        for item in presenze_data:
            bambino_id = item.get('bambino')
            if bambino_id is None or item.get('presente') is None:
                continue
            defaults = {
                'presente': item['presente'],
                'ora_arrivo': item.get('ora_arrivo') or None,
                'ora_uscita': item.get('ora_uscita') or None,
                'assenza_comunicata': item.get('assenza_comunicata', False),
                'motivo_assenza': item.get('motivo_assenza', ''),
                'note': item.get('note', ''),
                'registrato_da': request.user,
            }
            try:
                obj, _ = Presenza.objects.update_or_create(
                    bambino_id=bambino_id,
                    data=data_str,
                    defaults=defaults,
                )
                saved.append(obj.id)
            except Exception as e:
                errors.append({'bambino': bambino_id, 'errore': str(e)})

        return Response({'salvati': len(saved), 'errori': errors})

    @action(detail=False, methods=['get'])
    def non_arrivati(self, request):
        """
        Admin/Direttrice/Coordinatrice: bambini attivi senza registro presenza per la data indicata.
        Flag di alert mattutino.
        """
        role = request.user.role
        if role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        data_str = request.query_params.get('data', str(date.today()))
        gruppo = request.query_params.get('gruppo', '')

        bambini_qs = (
            Bambino.objects.filter(attivo=True)
            .select_related('gruppo')
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo)

        bambini_con_registro = set(
            Presenza.objects.filter(data=data_str).values_list('bambino_id', flat=True)
        )

        non_arrivati = [
            {'id': b.id, 'nome': b.nome, 'cognome': b.cognome, 'sezione': b.sezione}
            for b in bambini_qs
            if b.id not in bambini_con_registro
        ]

        return Response({
            'data': data_str,
            'totale_attivi': bambini_qs.count(),
            'con_registro': len(bambini_con_registro),
            'non_arrivati': non_arrivati,
        })

    @action(detail=False, methods=['get'])
    def report_mensile(self, request):
        """
        Admin/Direttrice: report mensile presenze per bambino — base per export PDF.
        Parametri: anno, mese, sezione (opzionale).
        """
        role = request.user.role
        if role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi = date.today()
        anno = int(request.query_params.get('anno', oggi.year))
        mese = int(request.query_params.get('mese', oggi.month))
        gruppo = request.query_params.get('gruppo', '')

        bambini_qs = (
            Bambino.objects.filter(attivo=True)
            .select_related('gruppo')
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo)

        presenze_mese = Presenza.objects.filter(data__year=anno, data__month=mese)
        mappa: dict[int, list] = {}
        for p in presenze_mese:
            mappa.setdefault(p.bambino_id, []).append(p)

        _, giorni_nel_mese = calendar.monthrange(anno, mese)

        result = []
        for b in bambini_qs:
            pres = mappa.get(b.id, [])
            giorni_presenti = sum(1 for p in pres if p.presente)
            giorni_assenti = sum(1 for p in pres if not p.presente)
            result.append({
                'bambino_id': b.id,
                'nome': b.nome,
                'cognome': b.cognome,
                'sezione': b.sezione,
                'giorni_presenti': giorni_presenti,
                'giorni_assenti': giorni_assenti,
                'giorni_non_registrati': giorni_nel_mese - giorni_presenti - giorni_assenti,
                'percentuale_presenza': round(giorni_presenti / giorni_nel_mese * 100) if giorni_nel_mese else 0,
            })

        return Response({
            'anno': anno,
            'mese': mese,
            'giorni_nel_mese': giorni_nel_mese,
            'bambini': result,
        })

    # ─── Cuoca ────────────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def presenti_oggi(self, request):
        """Cuoca: contatore bambini presenti oggi per calibrare le porzioni."""
        oggi = date.today()
        gruppo = request.query_params.get('gruppo', '')
        qs = Presenza.objects.filter(data=oggi, presente=True)
        if gruppo:
            qs = qs.filter(bambino__gruppo_id=gruppo)
        return Response({'data': str(oggi), 'presenti': qs.count()})

    # ─── Genitore ─────────────────────────────────────────────────────────────

    @action(detail=False, methods=['post'])
    def comunica_assenza(self, request):
        """
        Genitore: comunica assenza del proprio figlio per oggi.
        Body: { bambino_id, motivo_assenza, note }
        """
        if request.user.role != Role.GENITORE:
            return Response({'detail': 'Riservato ai genitori.'}, status=status.HTTP_403_FORBIDDEN)

        bambino_id = request.data.get('bambino_id')
        if not bambino_id:
            return Response(
                {'detail': 'Campo "bambino_id" obbligatorio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        try:
            bambino = Bambino.objects.select_related(
                'famiglia__genitore1', 'famiglia__genitore2'
            ).get(id=bambino_id)
            famiglia = bambino.famiglia
            if famiglia.genitore1_id != user.pk and famiglia.genitore2_id != user.pk:
                return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi = date.today()
        motivo = request.data.get('motivo_assenza', Presenza.MotivoAssenza.ALTRO)
        note = request.data.get('note', '')

        presenza, created = Presenza.objects.get_or_create(
            bambino_id=bambino_id,
            data=oggi,
            defaults={
                'presente': False,
                'assenza_comunicata': True,
                'motivo_assenza': motivo,
                'note': note,
                'registrato_da': user,
            },
        )

        if not created:
            if presenza.presente:
                return Response(
                    {'detail': 'Il bambino è già registrato come presente oggi.'},
                    status=status.HTTP_409_CONFLICT,
                )
            presenza.assenza_comunicata = True
            presenza.motivo_assenza = motivo
            presenza.note = note
            presenza.save(update_fields=['assenza_comunicata', 'motivo_assenza', 'note'])

        return Response(PresenzaSerializer(presenza).data)

    @action(detail=False, methods=['get'])
    def mio_figlio(self, request):
        """
        Genitore: storico presenze del proprio figlio + statistiche mese corrente.
        Parametri: bambino (obbligatorio).
        """
        if request.user.role != Role.GENITORE:
            return Response({'detail': 'Riservato ai genitori.'}, status=status.HTTP_403_FORBIDDEN)

        bambino_id = request.query_params.get('bambino')
        user = request.user

        if not bambino_id:
            # Fallback: tutte le presenze dei bambini visibili al genitore
            qs = (
                Presenza.objects
                .filter(
                    Q(bambino__famiglia__genitore1=user)
                    | Q(bambino__famiglia__genitore2=user)
                )
                .select_related('registrato_da')
                .order_by('-data')
            )
            return Response({'presenze': PresenzaSerializer(qs, many=True).data, 'stats_mese': None})

        try:
            bambino = Bambino.objects.select_related(
                'famiglia__genitore1', 'famiglia__genitore2'
            ).get(id=bambino_id)
            famiglia = bambino.famiglia
            if famiglia.genitore1_id != user.pk and famiglia.genitore2_id != user.pk:
                return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        presenze = (
            Presenza.objects
            .filter(bambino_id=bambino_id)
            .select_related('registrato_da')
            .order_by('-data')[:60]
        )

        oggi = date.today()
        presenze_mese = Presenza.objects.filter(
            bambino_id=bambino_id,
            data__year=oggi.year,
            data__month=oggi.month,
        )
        giorni_presenti = presenze_mese.filter(presente=True).count()
        giorni_assenti = presenze_mese.filter(presente=False).count()

        return Response({
            'presenze': PresenzaSerializer(presenze, many=True).data,
            'stats_mese': {
                'anno': oggi.year,
                'mese': oggi.month,
                'giorni_presenti': giorni_presenti,
                'giorni_assenti': giorni_assenti,
            },
        })
