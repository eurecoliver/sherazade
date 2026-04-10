from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.config.permessi import check_permesso
from apps.users.models import Role

TIPO_ADMIN_ROLES = (Role.ADMIN, Role.DIRETTRICE)


class EventoPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('calendario').
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return check_permesso(request.user, 'calendario', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'calendario', 'leggi')
        return check_permesso(request.user, 'calendario', 'scrivi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return check_permesso(request.user, 'calendario', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'calendario', 'leggi')
        return check_permesso(request.user, 'calendario', 'scrivi')


class TipoEventoPermission(BasePermission):
    """
    Admin/Direttrice: CRUD tipi evento (hardcoded — configurazione di sistema).
    Others: read-only.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'calendario', 'leggi')
        return request.user.role in TIPO_ADMIN_ROLES
