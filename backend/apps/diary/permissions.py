from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.config.permessi import check_permesso
from apps.users.models import Role


class DiarioPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('diario').
    Azioni speciali  : mio_figlio / giornata → 'leggi'.
    Genitore         : object-level solo propri figli.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        action = getattr(view, 'action', None)
        if action in ('mio_figlio', 'giornata'):
            return check_permesso(request.user, 'diario', 'leggi')
        if request.method == 'DELETE':
            return check_permesso(request.user, 'diario', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'diario', 'leggi')
        return check_permesso(request.user, 'diario', 'scrivi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            if not check_permesso(request.user, 'diario', 'elimina'):
                return False
        elif request.method in SAFE_METHODS:
            if not check_permesso(request.user, 'diario', 'leggi'):
                return False
        else:
            if not check_permesso(request.user, 'diario', 'scrivi'):
                return False
        # Genitore: solo propri figli (regola di business)
        if request.user.role == Role.GENITORE:
            if request.method not in SAFE_METHODS:
                return False
            bambino = getattr(obj, 'bambino', None) or getattr(getattr(obj, 'registro', None), 'bambino', None)
            if bambino is None:
                return False
            try:
                return (
                    bambino.famiglia.genitore1 == request.user
                    or bambino.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return True
