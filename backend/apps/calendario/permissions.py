from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.users.models import Role

EDITOR_ROLES = (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE)
TIPO_ADMIN_ROLES = (Role.ADMIN, Role.DIRETTRICE)


class EventoPermission(BasePermission):
    """
    Admin / Direttrice / Coordinatrice / Insegnante: CRUD eventi.
    Genitore / Cuoca: read-only.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in EDITOR_ROLES

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in EDITOR_ROLES


class TipoEventoPermission(BasePermission):
    """
    Admin / Direttrice: CRUD tipi evento.
    Others: read-only.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in TIPO_ADMIN_ROLES
