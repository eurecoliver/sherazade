from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.users.models import Role


class DiarioPermission(BasePermission):
    """
    Admin/Direttrice/Coordinatrice : CRUD completo.
    Insegnante : CRUD sui registri (crea/modifica giornata).
    Genitore : sola lettura dei propri figli.
    Cuoca : nessun accesso.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return True
        if role == Role.INSEGNANTE:
            return True
        if role == Role.GENITORE:
            return request.method in SAFE_METHODS or view.action in ('mio_figlio',)
        return False

    def has_object_permission(self, request, view, obj):
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return True
        if role == Role.INSEGNANTE:
            return True
        if role == Role.GENITORE:
            if not request.method in SAFE_METHODS:
                return False
            # Accede solo ai registri dei propri figli
            bambino = getattr(obj, 'bambino', None) or getattr(obj.registro, 'bambino', None)
            if bambino is None:
                return False
            try:
                return (
                    bambino.famiglia.genitore1 == request.user
                    or bambino.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return False
