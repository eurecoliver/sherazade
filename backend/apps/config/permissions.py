from rest_framework.permissions import BasePermission

from apps.users.models import Role

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')
STAFF_READ_ROLES = (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE, Role.CUOCA)
WRITE_ROLES = (Role.ADMIN, Role.DIRETTRICE)


class IsAdminOnly(BasePermission):
    """Solo Admin può gestire ruoli e permessi (sicurezza critica)."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.ADMIN
        )


class IsAdminOrDirettrice(BasePermission):
    """Lettura: tutti gli staff. Scrittura: Admin o Direttrice."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return request.user.role in STAFF_READ_ROLES
        return request.user.role in WRITE_ROLES
