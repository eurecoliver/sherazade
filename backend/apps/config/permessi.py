"""
Utility per il controllo dei permessi granulari basati su DB.

Admin bypassa il DB e ha sempre accesso completo.
Tutti gli altri ruoli vengono controllati sulla tabella PermessoRuolo.
Nota: nessuna cache per evitare inconsistenze con più worker Gunicorn.
"""

ADMIN_ROLES = ('admin',)


def check_permesso(user, risorsa: str, azione: str) -> bool:
    """
    Restituisce True se l'utente ha il permesso richiesto.
    Admin ha sempre accesso completo (hardcoded).
    """
    if not user or not user.is_authenticated:
        return False
    if user.role in ADMIN_ROLES:
        return True
    from .models import PermessoRuolo
    return PermessoRuolo.objects.filter(
        ruolo=user.role, risorsa=risorsa, azione=azione, consentito=True
    ).exists()
