"""Utility per l'invio di notifiche push PWA.

Usare send_push_to_users() da funzioni già in esecuzione in un thread separato
(es. _invia_notifica_circolare). La funzione è sincrona per evitare thread annidati.
"""
import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _send_push_to_sub(sub, payload_json: str):
    """Invia push a una singola sottoscrizione. Rimuove automaticamente quelle scadute."""
    try:
        from pywebpush import webpush, WebPushException
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=payload_json,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}"},
            ttl=86400,
        )
    except Exception as e:
        try:
            from pywebpush import WebPushException
            if isinstance(e, WebPushException) and getattr(e, 'response', None) is not None:
                if e.response.status_code in (404, 410):
                    # Subscription scaduta o rimossa dal browser
                    sub.delete()
                    return
        except ImportError:
            pass
        logger.debug("Push send error (sub %s): %s", sub.pk, e)


def send_push_to_users(user_ids: list, title: str, body: str, url: str = '/'):
    """
    Invia notifica push a tutti i dispositivi registrati degli utenti indicati.
    Sincrona — chiamare dall'interno di un thread già avviato.
    Se VAPID non configurato, skip silenzioso.
    """
    if not getattr(settings, 'VAPID_PRIVATE_KEY', ''):
        return

    from .models import PushSubscription
    subs = list(PushSubscription.objects.filter(user_id__in=user_ids))
    if not subs:
        return

    payload = json.dumps({"title": title, "body": body, "url": url}, ensure_ascii=False)
    for sub in subs:
        _send_push_to_sub(sub, payload)
