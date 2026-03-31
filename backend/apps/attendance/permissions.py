from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.users.models import Role


class PresenzaPermission(BasePermission):
    """
    Admin/Direttrice/Coordinatrice: CRUD completo + report.
    Insegnante: CRUD (registra le presenze quotidiane).
    Cuoca: lettura (per calibrare le porzioni).
    Genitore: lettura propri figli + comunica_assenza + mio_figlio.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE):
            return True
        if role == Role.CUOCA:
            return request.method in SAFE_METHODS or view.action in ('presenti_oggi',)
        if role == Role.GENITORE:
            return (
                request.method in SAFE_METHODS
                or view.action in ('comunica_assenza', 'mio_figlio')
            )
        return False

    def has_object_permission(self, request, view, obj):
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE):
            return True
        if role == Role.CUOCA:
            return request.method in SAFE_METHODS
        if role == Role.GENITORE:
            if request.method not in SAFE_METHODS:
                return False
            try:
                return (
                    obj.bambino.famiglia.genitore1_id == request.user.pk
                    or obj.bambino.famiglia.genitore2_id == request.user.pk
                )
            except Exception:
                return False
        return False
