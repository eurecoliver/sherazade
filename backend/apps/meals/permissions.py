from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.config.permessi import check_permesso
from apps.users.models import Role


class AllergiaPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('bambini' — le allergie
                       sono dati anagrafici del bambino).
    Genitore         : object-level solo propri figli.
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
        if request.method == 'DELETE':
            if not check_permesso(request.user, 'bambini', 'elimina'):
                return False
        elif request.method in SAFE_METHODS:
            if not check_permesso(request.user, 'bambini', 'leggi'):
                return False
        else:
            if not check_permesso(request.user, 'bambini', 'scrivi'):
                return False
        if request.user.role == Role.GENITORE:
            try:
                return (
                    obj.bambino.famiglia.genitore1 == request.user
                    or obj.bambino.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return True


class MenuPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('pappe').
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return check_permesso(request.user, 'pappe', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'pappe', 'leggi')
        return check_permesso(request.user, 'pappe', 'scrivi')

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class RegistroPastoPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('pappe').
    Genitore         : object-level solo propri figli.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        action = getattr(view, 'action', None)
        if action == 'mio_figlio':
            return check_permesso(request.user, 'pappe', 'leggi')
        if request.method == 'DELETE':
            return check_permesso(request.user, 'pappe', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'pappe', 'leggi')
        return check_permesso(request.user, 'pappe', 'scrivi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            if not check_permesso(request.user, 'pappe', 'elimina'):
                return False
        elif request.method in SAFE_METHODS:
            if not check_permesso(request.user, 'pappe', 'leggi'):
                return False
        else:
            if not check_permesso(request.user, 'pappe', 'scrivi'):
                return False
        if request.user.role == Role.GENITORE:
            if request.method not in SAFE_METHODS:
                return False
            try:
                return (
                    obj.bambino.famiglia.genitore1 == request.user
                    or obj.bambino.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return True
