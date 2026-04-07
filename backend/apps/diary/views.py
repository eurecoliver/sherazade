from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.children.models import Bambino
from apps.consents.models import ConsensoFotografico
from apps.users.models import Role
from .models import RegistroDiario, MediaDiario, TagCosaPortare
from .permissions import DiarioPermission
from .serializers import (
    RegistroDiarioSerializer,
    RegistroDiarioWriteSerializer,
    MediaDiarioSerializer,
    TagCosaPortareSerializer,
)


def _bambino_ha_consenso_media(bambino):
    """
    Controlla che il bambino abbia consenso attivo per uso_interno E genitori_diretti.
    Restituisce (ok: bool, messaggio: str).
    """
    if bambino.non_fotografabile:
        return False, 'Il bambino è marcato come non fotografabile.'

    for finalita in (
        ConsensoFotografico.Finalita.USO_INTERNO,
        ConsensoFotografico.Finalita.GENITORI_DIRETTI,
    ):
        try:
            c = bambino.consensi.get(finalita=finalita)
        except ConsensoFotografico.DoesNotExist:
            return False, f'Consenso "{finalita}" non configurato per questo bambino.'

        if c.revocato:
            return False, f'Il consenso "{c.get_finalita_display()}" è stato revocato.'

        # Almeno un genitore deve aver dato il consenso
        has_consenso = c.consenso_genitore1
        try:
            if bambino.famiglia.genitore2 is not None:
                has_consenso = has_consenso or bool(c.consenso_genitore2)
        except Exception:
            pass

        if not has_consenso:
            return False, f'Nessun consenso attivo per "{c.get_finalita_display()}".'

    return True, ''


class RegistroDiarioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, DiarioPermission]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return RegistroDiarioWriteSerializer
        return RegistroDiarioSerializer

    def get_queryset(self):
        user = self.request.user
        qs = (
            RegistroDiario.objects
            .select_related('bambino__famiglia__genitore1', 'bambino__famiglia__genitore2', 'autore')
            .prefetch_related('media', 'tags_cosa_portare')
        )

        if user.role == Role.GENITORE:
            qs = qs.filter(
                Q(bambino__famiglia__genitore1=user)
                | Q(bambino__famiglia__genitore2=user)
            )
        elif user.role not in (
            Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE
        ):
            return qs.none()

        # Filtri opzionali
        params = self.request.query_params
        if bambino_id := params.get('bambino'):
            qs = qs.filter(bambino_id=bambino_id)
        if data := params.get('data'):
            qs = qs.filter(data=data)
        if gruppo := params.get('gruppo'):
            qs = qs.filter(bambino__gruppo_id=gruppo)

        return qs

    def perform_create(self, serializer):
        serializer.save(autore=self.request.user)

    @action(detail=False, methods=['get'])
    def giornata(self, request):
        """
        Vista giornaliera per insegnante/staff.
        Parametri: data (default oggi), sezione (opzionale).
        Restituisce tutti i bambini attivi con il loro registro del giorno (se esiste).
        """
        from datetime import date
        data_str = request.query_params.get('data', str(date.today()))
        gruppo = request.query_params.get('gruppo', '')

        bambini_qs = (
            Bambino.objects
            .filter(attivo=True)
            .select_related('famiglia__genitore1', 'famiglia__genitore2', 'gruppo')
            .prefetch_related('consensi')
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo)

        # Registri del giorno indicizzati per bambino_id
        registri = {
            r.bambino_id: r
            for r in RegistroDiario.objects
            .filter(data=data_str)
            .prefetch_related('media', 'tags_cosa_portare')
            .select_related('autore')
        }

        result = []
        for b in bambini_qs:
            consenso_ok, consenso_msg = _bambino_ha_consenso_media(b)
            registro = registri.get(b.id)
            result.append({
                'bambino': {
                    'id': b.id,
                    'nome': b.nome,
                    'cognome': b.cognome,
                    'sezione': b.sezione,
                    'non_fotografabile': b.non_fotografabile,
                },
                'consenso_ok': consenso_ok,
                'consenso_msg': consenso_msg,
                'registro': RegistroDiarioSerializer(registro, context={'request': request}).data
                if registro else None,
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def mio_figlio(self, request):
        """Genitore: feed cronologico del proprio figlio."""
        if request.user.role != Role.GENITORE:
            return Response({'detail': 'Riservato ai genitori.'}, status=status.HTTP_403_FORBIDDEN)

        bambino_id = request.query_params.get('bambino')
        if not bambino_id:
            return Response({'detail': 'Parametro "bambino" obbligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verifica che il bambino appartenga al genitore
        user = request.user
        try:
            bambino = Bambino.objects.select_related('famiglia').get(
                id=bambino_id,
            )
            if (bambino.famiglia.genitore1 != user
                    and bambino.famiglia.genitore2 != user):
                return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        except Bambino.DoesNotExist:
            return Response({'detail': 'Bambino non trovato.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        registri = (
            RegistroDiario.objects
            .filter(bambino_id=bambino_id)
            .select_related('autore')
            .prefetch_related('media', 'tags_cosa_portare')
            .order_by('-data')
        )

        # Genitore vede solo media visibile_a_genitori=True
        serializer = RegistroDiarioSerializer(
            registri, many=True, context={'request': request}
        )
        data = serializer.data
        for item in data:
            item['media'] = [m for m in item['media'] if m['visibile_a_genitori']]

        return Response(data)


class MediaDiarioViewSet(viewsets.ModelViewSet):
    serializer_class = MediaDiarioSerializer
    permission_classes = [IsAuthenticated, DiarioPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        qs = MediaDiario.objects.select_related(
            'registro__bambino__famiglia__genitore1',
            'registro__bambino__famiglia__genitore2',
            'caricato_da',
        )
        if user.role == Role.GENITORE:
            return qs.filter(
                visibile_a_genitori=True,
            ).filter(
                Q(registro__bambino__famiglia__genitore1=user)
                | Q(registro__bambino__famiglia__genitore2=user)
            )
        if user.role not in (
            Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE
        ):
            return qs.none()
        return qs

    def perform_create(self, serializer):
        registro = serializer.validated_data['registro']
        bambino = registro.bambino

        ok, msg = _bambino_ha_consenso_media(bambino)
        if not ok:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(f'Impossibile caricare media: {msg}')

        serializer.save(caricato_da=self.request.user)


class TagCosaPortareViewSet(viewsets.ModelViewSet):
    serializer_class = TagCosaPortareSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role = self.request.user.role
        if role == Role.GENITORE:
            return TagCosaPortare.objects.filter(attivo=True)
        return TagCosaPortare.objects.all()

    def perform_create(self, serializer):
        serializer.save(creato_da=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: disattiva il tag senza cancellarlo (preserva storico diari)."""
        role = request.user.role
        if role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        tag = self.get_object()
        tag.attivo = False
        tag.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
