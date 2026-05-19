from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.config.permessi import check_permesso
from apps.users.models import Role


class PresenzaPermission(BasePermission):
    """
    Admin/Direttrice : CRUD completo (hardcoded).
    Altri ruoli      : controllati da PermessoRuolo ('presenze').
    Azioni speciali  : comunica_assenza / mio_figlio / salva_giornata → 'scrivi';
                       presenti_oggi / giornata / non_arrivati / report_mensile → 'leggi'.
    Genitore         : object-level solo propri figli.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        action = getattr(view, 'action', None)
        if action == 'salva_giornata':
            # Solo staff — il genitore NON deve poter modificare presenze altrui
            return request.user.role in (
                Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE
            )
        if action in ('comunica_assenza', 'mio_figlio'):
            return check_permesso(request.user, 'presenze', 'scrivi')
        if action in ('presenti_oggi', 'giornata', 'non_arrivati', 'report_mensile'):
            return check_permesso(request.user, 'presenze', 'leggi')
        if action == 'insegnanti_giornata':
            return check_permesso(request.user, 'presenze', 'leggi')
        # QR check-in: token visibile a chi può leggere le presenze; checkin aperto a tutti i loggati
        if action in ('qr_token', 'qr_config'):
            return check_permesso(request.user, 'presenze', 'leggi')
        if action == 'qr_token_insegnanti':
            return check_permesso(request.user, 'presenze', 'leggi')
        if action in ('checkin_info', 'perform_checkin'):
            return True  # logica parentela gestita nell'action
        if action in ('checkin_info_insegnanti', 'perform_checkin_insegnanti'):
            return True  # logica ruolo gestita nell'action
        if request.method == 'DELETE':
            return check_permesso(request.user, 'presenze', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'presenze', 'leggi')
        return check_permesso(request.user, 'presenze', 'scrivi')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            if not check_permesso(request.user, 'presenze', 'elimina'):
                return False
        elif request.method in SAFE_METHODS:
            if not check_permesso(request.user, 'presenze', 'leggi'):
                return False
        else:
            if not check_permesso(request.user, 'presenze', 'scrivi'):
                return False
        # Genitore: solo propri figli (regola di business)
        if request.user.role == Role.GENITORE:
            if request.method not in SAFE_METHODS:
                return False
            try:
                return (
                    obj.bambino.famiglia.genitore1_id == request.user.pk
                    or obj.bambino.famiglia.genitore2_id == request.user.pk
                )
            except Exception:
                return False
        return True
