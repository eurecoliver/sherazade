from django.conf import settings
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from .models import PushSubscription


class NotificheViewSet(GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='subscribe')
    def subscribe(self, request):
        """Registra una sottoscrizione push per il dispositivo corrente."""
        endpoint = request.data.get('endpoint', '').strip()
        p256dh = request.data.get('p256dh', '').strip()
        auth = request.data.get('auth', '').strip()

        if not all([endpoint, p256dh, auth]):
            return Response(
                {'error': 'Dati sottoscrizione mancanti (endpoint, p256dh, auth)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={'p256dh': p256dh, 'auth': auth},
        )
        return Response({'status': 'subscribed'})

    @action(detail=False, methods=['post'], url_path='unsubscribe')
    def unsubscribe(self, request):
        """Rimuove la sottoscrizione push del dispositivo corrente."""
        endpoint = request.data.get('endpoint', '').strip()
        if endpoint:
            PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response({'status': 'unsubscribed'})

    @action(detail=False, methods=['get'], url_path='vapid-public-key')
    def vapid_public_key(self, request):
        """Restituisce la chiave pubblica VAPID per la sottoscrizione browser."""
        key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
        return Response({'key': key})
