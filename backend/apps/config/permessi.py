"""
Utility per il controllo dei permessi granulari basati su DB.

Admin e Direttrice hanno sempre accesso completo (hardcoded).
Tutti gli altri ruoli (Coordinatrice, Insegnante, Cuoca, Genitore) vengono
controllati sulla tabella PermessoRuolo, con cache per 5 minuti per ridurre
le query al DB.
"""
from django.core.cache import cache

ADMIN_ROLES = ('admin',)  # Solo admin bypassa il DB — tutti gli altri ruoli usano PermessoRuolo
_CACHE_TIMEOUT = 300  # secondi


def _cache_key(ruolo: str) -> str:
    return f'permessi_ruolo_v1_{ruolo}'


def get_permessi_ruolo(ruolo: str) -> set:
    """Restituisce un set di tuple (risorsa, azione) consentite per il ruolo."""
    key = _cache_key(ruolo)
    cached = cache.get(key)
    if cached is not None:
        return cached
    from .models import PermessoRuolo
    permessi = set(
        PermessoRuolo.objects.filter(ruolo=ruolo, consentito=True)
        .values_list('risorsa', 'azione')
    )
    cache.set(key, permessi, timeout=_CACHE_TIMEOUT)
    return permessi


def invalida_cache_permessi(ruolo: str) -> None:
    cache.delete(_cache_key(ruolo))


def check_permesso(user, risorsa: str, azione: str) -> bool:
    """
    Restituisce True se l'utente ha il permesso richiesto.
    Admin e Direttrice ottengono sempre True.
    """
    if not user or not user.is_authenticated:
        return False
    if user.role in ADMIN_ROLES:
        return True
    return (risorsa, azione) in get_permessi_ruolo(user.role)
