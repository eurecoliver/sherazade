from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.users.models import Role


class ConsensoPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo.
    Coordinatrice/Insegnante : sola lettura.
    Genitore : lettura dei propri figli + dai/revoca il proprio consenso.
    Cuoca : nessun accesso.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE):
            return True
        if role in (Role.COORDINATRICE, Role.INSEGNANTE):
            return request.method in SAFE_METHODS
        if role == Role.GENITORE:
            # List/retrieve + custom actions dai_consenso/revoca_consenso/miei
            return request.method in SAFE_METHODS or view.action in (
                'dai_consenso', 'revoca_consenso', 'miei',
            )
        return False

    def has_object_permission(self, request, view, obj):
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE):
            return True
        if role in (Role.COORDINATRICE, Role.INSEGNANTE):
            return request.method in SAFE_METHODS
        if role == Role.GENITORE:
            # Può accedere solo ai consensi dei propri figli
            try:
                return (
                    obj.bambino.famiglia.genitore1 == request.user
                    or obj.bambino.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return False
