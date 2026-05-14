from rest_framework import permissions
from apps.users.models import Role

MANAGER_ROLES = (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE)


class IscrizioniPublicPermission(permissions.BasePermission):
    """
    POST (submit form): chiunque (AllowAny).
    Tutto il resto: solo staff.
    """
    def has_permission(self, request, view):
        if request.method == 'POST' and view.action == 'create':
            return True
        return request.user and request.user.is_authenticated


class ConfigPermission(permissions.BasePermission):
    """Solo Admin/Direttrice possono modificare la configurazione."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return request.user.role in MANAGER_ROLES
        return request.user.role in (Role.ADMIN, Role.DIRETTRICE)
