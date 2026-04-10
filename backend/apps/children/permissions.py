from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.users.models import Role
from apps.config.permessi import check_permesso


class IsDirigente(BasePermission):
    """Solo Admin o Direttrice."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in (Role.ADMIN, Role.DIRETTRICE)
        )


class BambinoPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('bambini').
    Genitore         : può leggere solo i propri figli (object-level).
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return check_permesso(request.user, 'bambini', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'bambini', 'leggi')
        return check_permesso(request.user, 'bambini', 'scrivi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        # Controllo permesso base
        if request.method == 'DELETE':
            if not check_permesso(request.user, 'bambini', 'elimina'):
                return False
        elif request.method in SAFE_METHODS:
            if not check_permesso(request.user, 'bambini', 'leggi'):
                return False
        else:
            if not check_permesso(request.user, 'bambini', 'scrivi'):
                return False
        # Genitore: solo propri figli (regola di business, non configurabile)
        if request.user.role == Role.GENITORE:
            if request.method not in SAFE_METHODS:
                return False
            try:
                return (
                    obj.famiglia.genitore1 == request.user
                    or obj.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return True
