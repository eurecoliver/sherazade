from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.users.models import Role

EDITOR_ROLES = (Role.ADMIN, Role.DIRETTRICE)
READER_ROLES = (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE, Role.GENITORE)


class CircolarePermission(BasePermission):
    """
    Admin / Direttrice: CRUD completo (incluse bozze).
    Coordinatrice / Insegnante: read-only (solo pubblicate).
    Genitore: read-only + segna-letta (solo pubblicate per il proprio gruppo).
    Cuoca: nessun accesso.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # segna-letta è un'azione POST consentita a tutti i lettori
        if getattr(view, 'action', None) == 'segna_letta':
            return request.user.role in READER_ROLES
        if request.method in SAFE_METHODS:
            return request.user.role in READER_ROLES
        return request.user.role in EDITOR_ROLES

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        # segna-letta permessa a tutti i lettori anche a livello object
        if getattr(view, 'action', None) == 'segna_letta':
            return request.user.role in READER_ROLES
        if request.method in SAFE_METHODS:
            # bozze visibili solo ad admin/direttrice
            if not obj.pubblicata:
                return request.user.role in EDITOR_ROLES
            return request.user.role in READER_ROLES
        return request.user.role in EDITOR_ROLES
