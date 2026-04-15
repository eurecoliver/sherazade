"""
LogAccessoMixin — aggiunge log GDPR automatico alle ViewSet sensibili.

Uso:
    class BambinoViewSet(LogAccessoMixin, viewsets.ModelViewSet):
        risorsa_nome = 'bambino'
        ...
"""
import threading

from .models import LogAccesso


def _get_ip(request) -> str:
    """Estrae l'IP reale anche dietro proxy/nginx."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '') or ''


def _write_log(utente_id, email, ruolo, azione, risorsa, oggetto_id, dettagli, ip):
    """Scrive il log nel DB. Eseguita in thread separato per non bloccare la risposta."""
    try:
        LogAccesso.objects.create(
            utente_id=utente_id,
            utente_email=email,
            utente_ruolo=ruolo,
            azione=azione,
            risorsa=risorsa,
            oggetto_id=oggetto_id,
            dettagli=dettagli,
            ip_address=ip or None,
        )
    except Exception:
        pass  # Il log non deve mai bloccare la risposta


class LogAccessoMixin:
    """
    Mixin per ViewSet Django REST Framework.
    Aggiunge log GDPR automatico per list/retrieve/create/update/destroy.

    Sovrascrivere `risorsa_nome` nelle sottoclassi per identificare la risorsa.
    """
    risorsa_nome: str = 'dati'

    def _log(self, request, azione: str, oggetto_id: str = '', dettagli: str = ''):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return
        t = threading.Thread(
            target=_write_log,
            args=(
                user.pk,
                getattr(user, 'email', ''),
                getattr(user, 'role', ''),
                azione,
                self.risorsa_nome,
                oggetto_id,
                dettagli,
                _get_ip(request),
            ),
            daemon=True,
        )
        t.start()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if response.status_code < 400:
            data = response.data
            count = data.get('count', len(data)) if isinstance(data, dict) else len(data)
            self._log(request, LogAccesso.Azione.LEGGI, dettagli=f'lista ({count} elementi)')
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        if response.status_code < 400:
            self._log(request, LogAccesso.Azione.LEGGI, oggetto_id=str(kwargs.get('pk', '')))
        return response

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code < 400:
            obj_id = str(response.data.get('id', '')) if isinstance(response.data, dict) else ''
            self._log(request, LogAccesso.Azione.CREA, oggetto_id=obj_id)
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code < 400:
            self._log(request, LogAccesso.Azione.MODIFICA, oggetto_id=str(kwargs.get('pk', '')))
        return response

    def destroy(self, request, *args, **kwargs):
        pk = str(kwargs.get('pk', ''))
        response = super().destroy(request, *args, **kwargs)
        if response.status_code < 400:
            self._log(request, LogAccesso.Azione.ELIMINA, oggetto_id=pk)
        return response
