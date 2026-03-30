from django.db.models import Q
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import Role
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


class BambinoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, BambinoPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'cognome', 'codice_fiscale']
    ordering_fields = ['cognome', 'nome', 'data_nascita', 'sezione']
    ordering = ['cognome', 'nome']

    def get_queryset(self):
        user = self.request.user
        qs = (
            Bambino.objects
            .select_related('famiglia__genitore1', 'famiglia__genitore2')
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
        sezione = self.request.query_params.get('sezione')
        if sezione:
            qs = qs.filter(sezione=sezione)

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


class FamigliaViewSet(viewsets.ModelViewSet):
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


class DelegaRitiroViewSet(viewsets.ModelViewSet):
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
