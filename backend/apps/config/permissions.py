from rest_framework.permissions import BasePermission

from apps.users.models import Role

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')
STAFF_READ_ROLES = (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE, Role.CUOCA)
WRITE_ROLES = (Role.ADMIN, Role.DIRETTRICE)


class IsAdminOrDirettrice(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return request.user.role in STAFF_READ_ROLES
        return request.user.role in WRITE_ROLES
