from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.users.models import Role
from apps.config.permessi import check_permesso

ADMIN_ROLE = Role.ADMIN  # Solo admin può vedere le letture (analytics)


class CircolarePermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo incluse bozze (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('circolari').
    segna-letta      : azione speciale, mappata a 'leggi'.
    letture          : solo Admin/Direttrice.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        action = getattr(view, 'action', None)
        if action == 'segna_letta':
            return check_permesso(request.user, 'circolari', 'leggi')
        if action == 'letture':
            return request.user.role == ADMIN_ROLE
        if request.method == 'DELETE':
            return check_permesso(request.user, 'circolari', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'circolari', 'leggi')
        return check_permesso(request.user, 'circolari', 'scrivi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        action = getattr(view, 'action', None)
        if action == 'segna_letta':
            return check_permesso(request.user, 'circolari', 'leggi')
        if action == 'letture':
            return request.user.role == ADMIN_ROLE
        if request.method in SAFE_METHODS:
            # Bozze visibili solo a chi può scrivere circolari
            if not obj.pubblicata:
                return check_permesso(request.user, 'circolari', 'scrivi')
            return check_permesso(request.user, 'circolari', 'leggi')
        if request.method == 'DELETE':
            return check_permesso(request.user, 'circolari', 'elimina')
        return check_permesso(request.user, 'circolari', 'scrivi')
