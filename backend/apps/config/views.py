from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated

from .models import Gruppo, OrarioUscita, PermessoRuolo
from .permissions import IsAdminOrDirettrice
from .permessi import invalida_cache_permessi
from .serializers import GruppoSerializer, OrarioUscitaSerializer, PermessoRuoloSerializer


class GruppoViewSet(viewsets.ModelViewSet):
    serializer_class = GruppoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrDirettrice]

    def get_queryset(self):
        qs = Gruppo.objects.prefetch_related('bambini')
        if self.request.query_params.get('attivo') == 'false':
            return qs
        return qs.filter(attivo=True)

    def perform_create(self, serializer):
        serializer.save(creato_da=self.request.user)


class OrarioUscitaViewSet(viewsets.ModelViewSet):
    serializer_class = OrarioUscitaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrDirettrice]

    def get_queryset(self):
        qs = OrarioUscita.objects.all()
        if self.request.query_params.get('attivo') == 'false':
            return qs
        return qs.filter(attivo=True)


class PermessoRuoloViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Lista e aggiornamento permessi granulari per ruolo. Solo admin/direttrice."""
    serializer_class = PermessoRuoloSerializer
    permission_classes = [IsAuthenticated, IsAdminOrDirettrice]

    def get_queryset(self):
        qs = PermessoRuolo.objects.all()
        ruolo = self.request.query_params.get('ruolo')
        if ruolo:
            qs = qs.filter(ruolo=ruolo)
        return qs

    def perform_update(self, serializer):
        instance = serializer.save()
        invalida_cache_permessi(instance.ruolo)
