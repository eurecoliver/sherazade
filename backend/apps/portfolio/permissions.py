from rest_framework.permissions import BasePermission, IsAuthenticated
from apps.config.permessi import check_permesso


class PortfolioMediaPermission(BasePermission):
    """
    Permessi media portfolio basati su PermessoRuolo (risorsa: 'portfolio').
    Admin bypassa tutto (gestito in check_permesso).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        action = getattr(view, 'action', '')
        if action in ('list', 'retrieve', 'giorni'):
            azione = 'leggi'
        elif action == 'create':
            azione = 'scrivi'
        elif action in ('update', 'partial_update'):
            azione = 'scrivi'
        elif action == 'destroy':
            azione = 'elimina'
        else:
            azione = 'leggi'
        return check_permesso(request.user, 'portfolio', azione)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class AnnoScolasticoPermission(BasePermission):
    """
    Lettura: tutti gli autenticati.
    Scrittura: solo admin/direttrice.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(view, 'action', '') in ('list', 'retrieve'):
            return True
        return request.user.role in ('admin', 'direttrice')
