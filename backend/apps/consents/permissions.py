from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.config.permessi import check_permesso
from apps.users.models import Role


class ConsensoPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('consensi').
    Genitore         : accede solo ai consensi dei propri figli (object-level).
    Azioni speciali  : dai_consenso / revoca_consenso → 'scrivi'; miei → 'leggi'.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        action = getattr(view, 'action', None)
        if action in ('dai_consenso', 'revoca_consenso'):
            return check_permesso(request.user, 'consensi', 'scrivi')
        if action == 'miei':
            return check_permesso(request.user, 'consensi', 'leggi')
        if request.method == 'DELETE':
            return check_permesso(request.user, 'consensi', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'consensi', 'leggi')
        return check_permesso(request.user, 'consensi', 'scrivi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            if not check_permesso(request.user, 'consensi', 'elimina'):
                return False
        elif request.method in SAFE_METHODS:
            if not check_permesso(request.user, 'consensi', 'leggi'):
                return False
        else:
            if not check_permesso(request.user, 'consensi', 'scrivi'):
                return False
        # Genitore: solo consensi dei propri figli (regola di business)
        if request.user.role == Role.GENITORE:
            try:
                return (
                    obj.bambino.famiglia.genitore1 == request.user
                    or obj.bambino.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return True
