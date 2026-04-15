from django.utils.dateparse import parse_date
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from apps.users.models import Role
from .models import LogAccesso
from .serializers import LogAccessoSerializer


class LogAccessoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API di sola lettura per i log accessi GDPR.
    Accessibile solo ad Admin e Direttrice.
    """
    serializer_class = LogAccessoSerializer
    filter_backends = [filters.OrderingFilter]
    ordering = ['-timestamp']
    ordering_fields = ['timestamp', 'risorsa', 'azione', 'utente_email']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role not in (Role.ADMIN, Role.DIRETTRICE):
            return LogAccesso.objects.none()

        qs = LogAccesso.objects.all()

        # Filtri opzionali
        dal = self.request.query_params.get('dal')
        al = self.request.query_params.get('al')
        risorsa = self.request.query_params.get('risorsa')
        azione = self.request.query_params.get('azione')
        utente = self.request.query_params.get('utente')  # ricerca per email

        if dal:
            d = parse_date(dal)
            if d:
                qs = qs.filter(timestamp__date__gte=d)
        if al:
            d = parse_date(al)
            if d:
                qs = qs.filter(timestamp__date__lte=d)
        if risorsa:
            qs = qs.filter(risorsa=risorsa)
        if azione:
            qs = qs.filter(azione=azione)
        if utente:
            qs = qs.filter(utente_email__icontains=utente)

        return qs
