from django.conf import settings
from django.db import models


class PushSubscription(models.Model):
    """Sottoscrizione push PWA di un utente su un dispositivo."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
    )
    endpoint = models.URLField(max_length=500)
    p256dh = models.TextField()
    auth = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'endpoint')]
        verbose_name = 'Sottoscrizione Push'
        verbose_name_plural = 'Sottoscrizioni Push'

    def __str__(self):
        return f"{self.user.email} — {self.endpoint[:60]}"
