from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from apps.users.models import User
from .models import Gruppo, OrarioUscita, PermessoRuolo, Ruolo
from .permissions import IsAdminOrDirettrice, IsAdminOnly
from .serializers import GruppoSerializer, OrarioUscitaSerializer, PermessoRuoloSerializer, RuoloSerializer


class GruppoViewSet(viewsets.ModelViewSet):
    serializer_class = GruppoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrDirettrice]
    pagination_class = None

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
    pagination_class = None

    def get_queryset(self):
        qs = OrarioUscita.objects.all()
        if self.request.query_params.get('attivo') == 'false':
            return qs
        return qs.filter(attivo=True)


class RuoloViewSet(viewsets.ModelViewSet):
    """CRUD ruoli. Solo Admin può creare/modificare/eliminare ruoli."""
    serializer_class = RuoloSerializer
    permission_classes = [IsAuthenticated, IsAdminOnly]
    pagination_class = None

    def get_queryset(self):
        return Ruolo.objects.all()

    def perform_create(self, serializer):
        ruolo = serializer.save()
        # Crea i record PermessoRuolo per la nuova risorsa (tutti False)
        records = [
            PermessoRuolo(ruolo=ruolo.codice, risorsa=risorsa, azione=azione, consentito=False)
            for risorsa, _ in PermessoRuolo.RISORSE
            for azione, _ in PermessoRuolo.AZIONI
        ]
        PermessoRuolo.objects.bulk_create(records, ignore_conflicts=True)

    def destroy(self, request, *args, **kwargs):
        ruolo = self.get_object()
        if ruolo.sistema:
            return Response(
                {'detail': 'Non puoi eliminare un ruolo di sistema.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user_count = User.objects.filter(role=ruolo.codice).count()
        if user_count > 0:
            return Response(
                {'detail': f'Ci sono {user_count} utenti con questo ruolo. Riassegnali prima di eliminarlo.', 'user_count': user_count},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Elimina i permessi associati
        PermessoRuolo.objects.filter(ruolo=ruolo.codice).delete()
        return super().destroy(request, *args, **kwargs)


class PermessoRuoloViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Lista e aggiornamento permessi granulari per ruolo. Solo Admin."""
    serializer_class = PermessoRuoloSerializer
    permission_classes = [IsAuthenticated, IsAdminOnly]

    def get_queryset(self):
        qs = PermessoRuolo.objects.all()
        ruolo = self.request.query_params.get('ruolo')
        if ruolo:
            qs = qs.filter(ruolo=ruolo)
        return qs

    def perform_update(self, serializer):
        serializer.save()


class MieiPermessiView(APIView):
    """
    Restituisce le risorse su cui l'utente corrente ha il permesso 'leggi'.
    Admin riceve tutte le risorse (accesso completo hardcoded).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'admin':
            risorse = [r for r, _ in PermessoRuolo.RISORSE]
        else:
            risorse = list(
                PermessoRuolo.objects.filter(
                    ruolo=user.role, azione='leggi', consentito=True
                ).values_list('risorsa', flat=True)
            )
        return Response({'risorse': risorse})
