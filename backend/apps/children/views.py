from django.db.models import Q
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import Role, User
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
            data['genitore2'] = g2.id
            data.pop('genitore2_email', None)
        serializer = FamigliaSerializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(FamigliaSerializer(instance).data)


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
