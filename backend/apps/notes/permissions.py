from rest_framework.permissions import BasePermission
from apps.users.models import Role

STAFF_ROLES = (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE)
MANAGER_ROLES = (Role.ADMIN, Role.DIRETTRICE)


class NotaPermission(BasePermission):
    """
    Admin / Direttrice / Coordinatrice / Insegnante : read + create + delete proprie note.
    Admin / Direttrice : delete qualsiasi nota.
    Cuoca / Genitore : nessun accesso.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in STAFF_ROLES

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        role = request.user.role
        if role in MANAGER_ROLES:
            return True
        if role in STAFF_ROLES:
            # può cancellare solo le proprie note
            return obj.autore_id == request.user.pk
        return False
