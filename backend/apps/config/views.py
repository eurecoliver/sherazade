from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Gruppo, OrarioUscita
from .permissions import IsAdminOrDirettrice
from .serializers import GruppoSerializer, OrarioUscitaSerializer


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
