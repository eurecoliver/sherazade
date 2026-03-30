from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.users.models import Role


class IsDirigente(BasePermission):
    """Solo Admin o Direttrice."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in (Role.ADMIN, Role.DIRETTRICE)
        )


class BambinoPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo.
    Coordinatrice/Insegnante : lettura + aggiornamento note_mediche (partial_update).
    Cuoca : sola lettura (campi limitati via serializer).
    Genitore : sola lettura del proprio figlio.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE):
            return True
        if role in (Role.COORDINATRICE, Role.INSEGNANTE):
            return request.method in SAFE_METHODS or view.action == 'partial_update'
        if role in (Role.GENITORE, Role.CUOCA):
            return request.method in SAFE_METHODS
        return False

    def has_object_permission(self, request, view, obj):
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE):
            return True
        if role in (Role.COORDINATRICE, Role.INSEGNANTE):
            return request.method in SAFE_METHODS or view.action == 'partial_update'
        if role == Role.CUOCA:
            return request.method in SAFE_METHODS
        if role == Role.GENITORE:
            if request.method not in SAFE_METHODS:
                return False
            try:
                return (
                    obj.famiglia.genitore1 == request.user
                    or obj.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return False
