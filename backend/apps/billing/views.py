from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from apps.users.models import Role
from .models import Fattura
from .serializers import FatturaSerializer


class IsAdminOrDirettrice(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in (Role.ADMIN, Role.DIRETTRICE)


class FatturaViewSet(viewsets.ModelViewSet):
    serializer_class = FatturaSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdminOrDirettrice()]

    def get_queryset(self):
        user = self.request.user
        qs = Fattura.objects.select_related('genitore', 'caricato_da')

        if user.role == Role.GENITORE:
            return qs.filter(genitore=user)

        if user.role not in (Role.ADMIN, Role.DIRETTRICE):
            return qs.none()

        # Filtri per admin/direttrice
        genitore_id = self.request.query_params.get('genitore')
        if genitore_id:
            qs = qs.filter(genitore_id=genitore_id)

        anno = self.request.query_params.get('anno')
        if anno:
            qs = qs.filter(anno=anno)

        mese = self.request.query_params.get('mese')
        if mese:
            qs = qs.filter(mese=mese)

        return qs

    def perform_create(self, serializer):
        serializer.save(caricato_da=self.request.user)

    def create(self, request, *args, **kwargs):
        # Upsert: se esiste già (stesso genitore/anno/mese/bambino), aggiorna
        genitore_id = request.data.get('genitore')
        anno = request.data.get('anno')
        mese = request.data.get('mese')
        bambino_id = request.data.get('bambino') or None  # null per famiglie monobambino

        if genitore_id and anno and mese:
            try:
                fattura = Fattura.objects.get(
                    genitore_id=genitore_id, anno=anno, mese=mese, bambino_id=bambino_id
                )
                serializer = self.get_serializer(fattura, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save(caricato_da=request.user)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Fattura.DoesNotExist:
                pass

        return super().create(request, *args, **kwargs)
