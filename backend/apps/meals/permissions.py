from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.users.models import Role


class AllergiaPermission(BasePermission):
    """
    Admin/Direttrice/Coordinatrice : CRUD completo.
    Insegnante : lettura.
    Cuoca : lettura (per consultare le allergie prima di cucinare).
    Genitore : lettura + CRUD propri figli.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return True
        if role in (Role.INSEGNANTE, Role.CUOCA):
            return request.method in SAFE_METHODS
        if role == Role.GENITORE:
            return True
        return False

    def has_object_permission(self, request, view, obj):
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return True
        if role in (Role.INSEGNANTE, Role.CUOCA):
            return request.method in SAFE_METHODS
        if role == Role.GENITORE:
            try:
                return (
                    obj.bambino.famiglia.genitore1 == request.user
                    or obj.bambino.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return False


class MenuPermission(BasePermission):
    """
    Admin/Direttrice/Coordinatrice : CRUD completo.
    Cuoca : CRUD completo (è chi inserisce i menu).
    Insegnante/Genitore : sola lettura.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.CUOCA):
            return True
        if role in (Role.INSEGNANTE, Role.GENITORE):
            return request.method in SAFE_METHODS
        return False

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class RegistroPastoPermission(BasePermission):
    """
    Admin/Direttrice/Coordinatrice : CRUD completo.
    Insegnante : CRUD (compila il foglio pappe).
    Cuoca : lettura.
    Genitore : lettura propri figli.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = request.user.role
        if role in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE):
            return True
        if role in (Role.CUOCA, Role.GENITORE):
            return request.method in SAFE_METHODS or view.action in ('mio_figlio',)
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
                    obj.bambino.famiglia.genitore1 == request.user
                    or obj.bambino.famiglia.genitore2 == request.user
                )
            except Exception:
                return False
        return False
