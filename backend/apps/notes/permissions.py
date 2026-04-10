from rest_framework.permissions import BasePermission
from apps.config.permessi import check_permesso
from apps.users.models import Role

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')
MANAGER_ROLES = (Role.ADMIN, Role.DIRETTRICE)


class NotaPermission(BasePermission):
    """
    Admin/Direttrice : accesso completo + delete qualsiasi nota (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('agenda').
    Object-level     : staff può cancellare solo le proprie note.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return check_permesso(request.user, 'agenda', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'agenda', 'leggi')
        return check_permesso(request.user, 'agenda', 'scrivi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            if not check_permesso(request.user, 'agenda', 'elimina'):
                return False
            # Admin/Direttrice possono cancellare qualsiasi nota
            if request.user.role in MANAGER_ROLES:
                return True
            # Gli altri solo le proprie
            return obj.autore_id == request.user.pk
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'agenda', 'leggi')
        return check_permesso(request.user, 'agenda', 'scrivi')
