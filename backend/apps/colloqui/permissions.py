from rest_framework.permissions import BasePermission
from apps.config.permessi import check_permesso
from apps.users.models import Role

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')

STAFF_ROLES = (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE)
MANAGER_ROLES = (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE)


class ColloquiPermission(BasePermission):
    """
    Sessioni: Manager (admin/direttrice/coordinatrice) CRUD;
              Insegnante read; Genitore read (solo aperte).
    Permesso risorsa 'colloqui' configurabile.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'colloqui', 'leggi')
        if request.method == 'DELETE':
            return check_permesso(request.user, 'colloqui', 'elimina')
        return check_permesso(request.user, 'colloqui', 'scrivi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'colloqui', 'leggi')
        if request.method == 'DELETE':
            return check_permesso(request.user, 'colloqui', 'elimina')
        return check_permesso(request.user, 'colloqui', 'scrivi')


class PrenotazionePermission(BasePermission):
    """
    Genitore: crea/disdice solo le proprie prenotazioni.
    Staff manager: vede e gestisce tutto.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return check_permesso(request.user, 'colloqui', 'leggi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.role in MANAGER_ROLES:
            return True
        # Genitore può modificare/cancellare solo le proprie prenotazioni
        return obj.genitore_id == request.user.pk
