import threading

from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AnnoScolastico, Iscrizione, MediaPortfolio
from .permissions import PortfolioMediaPermission, AnnoScolasticoPermission
from .serializers import (
    AnnoScolasticoSerializer,
    IscrizioneSerializer,
    MediaPortfolioSerializer,
    MediaPortfolioWriteSerializer,
)


def _genera_thumbnail_bg(media_id: int):
    """Genera thumbnail in background thread dopo l'upload."""
    try:
        media = MediaPortfolio.objects.get(pk=media_id)
        media.genera_thumbnail()
        if media.thumbnail:
            media.save(update_fields=['thumbnail'])
    except Exception:
        pass


class AnnoScolasticoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, AnnoScolasticoPermission]
    serializer_class = AnnoScolasticoSerializer
    pagination_class = None

    def get_queryset(self):
        return AnnoScolastico.objects.all()

    def perform_create(self, serializer):
        serializer.save(creato_da=self.request.user)


class IscrizioneViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, AnnoScolasticoPermission]
    serializer_class = IscrizioneSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Iscrizione.objects.select_related('bambino', 'anno', 'gruppo')
        anno = self.request.query_params.get('anno')
        bambino = self.request.query_params.get('bambino')
        if anno:
            qs = qs.filter(anno_id=anno)
        if bambino:
            qs = qs.filter(bambino_id=bambino)
        return qs


class MediaPortfolioViewSet(viewsets.ModelViewSet):
    permission_classes = [PortfolioMediaPermission]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return MediaPortfolioWriteSerializer
        return MediaPortfolioSerializer

    def get_queryset(self):
        user = self.request.user
        qs = MediaPortfolio.objects.filter(attivo=True).select_related(
            'anno', 'gruppo', 'autore'
        )

        # Genitori: solo anno+gruppo dei propri figli (via Iscrizioni, o gruppo corrente)
        if user.role == 'genitore':
            try:
                from apps.children.models import Famiglia
                famiglie = Famiglia.objects.filter(
                    Q(genitore1=user) | Q(genitore2=user)
                )
                pairs = set()
                bambini_list = []
                for famiglia in famiglie:
                    for bambino in famiglia.bambini.prefetch_related('iscrizioni__anno', 'iscrizioni__gruppo'):
                        bambini_list.append(bambino)
                        for iscr in bambino.iscrizioni.all():
                            pairs.add((iscr.anno_id, iscr.gruppo_id))

                if not pairs:
                    # Fallback: usa il gruppo corrente del bambino per tutti gli anni
                    tutti_anni = list(AnnoScolastico.objects.values_list('id', flat=True))
                    for bambino in bambini_list:
                        if bambino.gruppo_id:
                            for anno_id in tutti_anni:
                                pairs.add((anno_id, bambino.gruppo_id))

                if not pairs:
                    return qs.none()

                q = Q()
                for anno_id, gruppo_id in pairs:
                    q |= Q(anno_id=anno_id, gruppo_id=gruppo_id)
                qs = qs.filter(q)
            except Exception:
                return qs.none()

        # Filtri comuni
        anno = self.request.query_params.get('anno')
        gruppo = self.request.query_params.get('gruppo')
        data = self.request.query_params.get('data')

        if anno:
            qs = qs.filter(anno_id=anno)
        if gruppo:
            qs = qs.filter(gruppo_id=gruppo)
        if data:
            qs = qs.filter(data=data)

        return qs.order_by('data', 'caricato_at')

    def perform_create(self, serializer):
        media = serializer.save(autore=self.request.user)
        t = threading.Thread(target=_genera_thumbnail_bg, args=(media.pk,), daemon=True)
        t.start()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.attivo = False
        instance.save(update_fields=['attivo'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='giorni')
    def giorni(self, request):
        """Restituisce la lista di date con media per un dato anno+gruppo."""
        qs = self.get_queryset()
        # I filtri anno/gruppo sono già applicati da get_queryset via query_params
        dates = list(
            qs.values_list('data', flat=True).distinct().order_by('data')
        )
        return Response([str(d) for d in dates])
