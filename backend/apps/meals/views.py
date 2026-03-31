from datetime import date

from django.db import IntegrityError
from django.db.models import Q, Prefetch
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.children.models import Bambino
from apps.users.models import Role
from .models import AllergiaIntolleranza, MenuGiornaliero, RegistroPasto
from .permissions import AllergiaPermission, MenuPermission, RegistroPastoPermission
from .serializers import (
    AllergiaIntolleranzaSerializer,
    MenuGiornalieroSerializer,
    RegistroPastoSerializer,
    RegistroPastoWriteSerializer,
)


class AllergiaIntolleranzaViewSet(viewsets.ModelViewSet):
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
        """
        Cuoca/Staff: lista bambini attivi con le loro allergie attive, raggruppati per sezione.
        Utile per la vista mattutina prima di preparare i pasti.
        """
        sezione = request.query_params.get('sezione', '')
        bambini_qs = (
            Bambino.objects
            .filter(attivo=True)
            .prefetch_related(
                Prefetch(
                    'allergie',
                    queryset=AllergiaIntolleranza.objects.filter(attivo=True).order_by('-gravita'),
                )
            )
            .order_by('sezione', 'cognome', 'nome')
        )
        if sezione:
            bambini_qs = bambini_qs.filter(sezione=sezione)

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
        """Restituisce il menu di oggi per la sezione indicata (o tutti se non specificata)."""
        sezione = request.query_params.get('sezione', '')
        qs = MenuGiornaliero.objects.filter(data=date.today()).select_related('inserito_da')
        if sezione:
            qs = qs.filter(sezione=sezione)
        return Response(MenuGiornalieroSerializer(qs, many=True).data)


class RegistroPastoViewSet(viewsets.ModelViewSet):
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
        if sezione := params.get('sezione'):
            qs = qs.filter(bambino__sezione=sezione)
        return qs

    def perform_create(self, serializer):
        serializer.save(compilato_da=self.request.user)

    @action(detail=False, methods=['get'])
    def giornata(self, request):
        """
        Vista staff: lista bambini con il loro registro pasto del giorno.
        Parametri: data (default oggi), sezione (opzionale).
        """
        data_str = request.query_params.get('data', str(date.today()))
        sezione = request.query_params.get('sezione', '')

        bambini_qs = (
            Bambino.objects
            .filter(attivo=True)
            .prefetch_related(
                Prefetch(
                    'allergie',
                    queryset=AllergiaIntolleranza.objects.filter(attivo=True).order_by('-gravita'),
                )
            )
            .order_by('sezione', 'cognome', 'nome')
        )
        if sezione:
            bambini_qs = bambini_qs.filter(sezione=sezione)

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
        """
        Salva (crea o aggiorna) i registri pasto di tutti i bambini di una sezione in un solo POST.
        Body: { data: "YYYY-MM-DD", pasti: [ { bambino, primo_quantita, ... }, ... ] }
        """
        data_str = request.data.get('data', str(date.today()))
        pasti = request.data.get('pasti', [])
        if not isinstance(pasti, list):
            return Response({'detail': 'Campo "pasti" deve essere una lista.'}, status=status.HTTP_400_BAD_REQUEST)

        saved, errors = [], []
        for item in pasti:
            bambino_id = item.get('bambino')
            if not bambino_id:
                continue
            defaults = {
                'primo_quantita': item.get('primo_quantita', ''),
                'secondo_quantita': item.get('secondo_quantita', ''),
                'contorno_quantita': item.get('contorno_quantita', ''),
                'frutta_quantita': item.get('frutta_quantita', ''),
                'merenda_quantita': item.get('merenda_quantita', ''),
                'note_pasto': item.get('note_pasto', ''),
                'compilato_da': request.user,
            }
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
        """Genitore: feed cronologico pasti del proprio figlio."""
        if request.user.role != Role.GENITORE:
            return Response({'detail': 'Riservato ai genitori.'}, status=status.HTTP_403_FORBIDDEN)

        bambino_id = request.query_params.get('bambino')
        user = request.user

        # Se bambino_id non è fornito → fallback: tutti i pasti dei bambini visibili al genitore
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

        # Verifica autorizzazione tramite Famiglia
        try:
            famiglia = bambino.famiglia
            autorizzato = (
                famiglia.genitore1_id == user.pk
                or famiglia.genitore2_id == user.pk
            )
        except Exception:
            # Bambino senza Famiglia: fallback sui pasti di tutti i bambini visibili al genitore
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
