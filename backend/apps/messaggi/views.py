import threading

from django.core.mail import send_mail
from django.conf import settings as django_settings
from django.db.models import Count, Q
from rest_framework import viewsets, parsers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.models import User, Role
from apps.children.models import Bambino
from .models import Circolare, LetturaCircolare
from .permissions import CircolarePermission
from .serializers import CircolareSerializer


def _invia_notifica_circolare(circolare_id: int):
    """Invia email + push ai genitori destinatari. Eseguita in thread separato."""
    try:
        circolare = Circolare.objects.prefetch_related('gruppi').get(pk=circolare_id)
        gruppi = list(circolare.gruppi.values_list('id', flat=True))

        # Calcola genitori destinatari (IDs)
        if gruppi:
            bambini_qs = Bambino.objects.filter(gruppo_id__in=gruppi, attivo=True)
            famiglia_ids = bambini_qs.values_list('famiglia_id', flat=True).distinct()
            from apps.children.models import Famiglia
            genitore1_ids = Famiglia.objects.filter(id__in=famiglia_ids).values_list('genitore1_id', flat=True)
            genitore2_ids = Famiglia.objects.filter(
                id__in=famiglia_ids, genitore2__isnull=False
            ).values_list('genitore2_id', flat=True)
            destinatari_ids = list(set(list(genitore1_ids) + list(genitore2_ids)))
        else:
            destinatari_ids = list(
                User.objects.filter(role=Role.GENITORE, is_active=True).values_list('id', flat=True)
            )

        if not destinatari_ids:
            return

        genitori = User.objects.filter(id__in=destinatari_ids, is_active=True)

        # EMAIL
        destinatari_email = list(genitori.exclude(email='').values_list('email', flat=True))
        if destinatari_email:
            soggetto = f'[Sherazade] {circolare.titolo}'
            corpo = (
                f'Gentile famiglia,\n\n'
                f'{circolare.testo}\n\n'
                f'Cordiali saluti,\nLo staff di Sherazade'
            )
            send_mail(
                subject=soggetto,
                message=corpo,
                from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@sherazade.it'),
                recipient_list=destinatari_email,
                fail_silently=True,
            )

        # PUSH (sincrono — siamo già in un thread separato)
        from apps.notifications.push import send_push_to_users
        anteprima = circolare.testo[:120] + ('…' if len(circolare.testo) > 120 else '')
        send_push_to_users(
            user_ids=destinatari_ids,
            title=f'📢 {circolare.titolo}',
            body=anteprima,
            url='/dashboard/genitore/circolari',
        )

        Circolare.objects.filter(pk=circolare_id).update(notifica_inviata=True)
    except Exception:
        pass


class CircolareViewSet(viewsets.ModelViewSet):
    permission_classes = [CircolarePermission]
    serializer_class = CircolareSerializer
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser]

    def get_queryset(self):
        user = self.request.user
        qs = Circolare.objects.prefetch_related('gruppi', 'letture').select_related('autore')

        # Bozze visibili solo a chi ha scrivi su circolari (admin sempre incluso via check_permesso)
        from apps.config.permessi import check_permesso
        if not check_permesso(user, 'circolari', 'scrivi'):
            qs = qs.filter(pubblicata=True)

        # Genitore vede solo circolari per il suo gruppo (o generali)
        if user.role == Role.GENITORE:
            from apps.children.models import Famiglia, Bambino

            famiglie = Famiglia.objects.filter(
                Q(genitore1=user) | Q(genitore2=user)
            )
            gruppo_ids = list(
                Bambino.objects.filter(famiglia__in=famiglie, attivo=True)
                .exclude(gruppo__isnull=True)
                .values_list('gruppo_id', flat=True)
                .distinct()
            )

            # Count('gruppi') = 0 → circolare senza gruppi → visibile a tutti
            qs = qs.annotate(cnt_gruppi=Count('gruppi')).filter(
                Q(cnt_gruppi=0) | Q(gruppi__id__in=gruppo_ids)
            ).distinct()

        # Filtri opzionali
        pubblicata = self.request.query_params.get('pubblicata')
        if pubblicata is not None:
            qs = qs.filter(pubblicata=pubblicata == '1' or pubblicata == 'true')

        return qs.order_by('-creato_at')

    def perform_create(self, serializer):
        circolare = serializer.save()
        if self.request.data.get('invia_notifica'):
            t = threading.Thread(target=_invia_notifica_circolare, args=(circolare.pk,), daemon=True)
            t.start()

    def perform_update(self, serializer):
        circolare = serializer.save()
        invia = self.request.data.get('invia_notifica')
        if invia and not circolare.notifica_inviata:
            t = threading.Thread(target=_invia_notifica_circolare, args=(circolare.pk,), daemon=True)
            t.start()

    @action(detail=True, methods=['post'], url_path='segna-letta')
    def segna_letta(self, request, pk=None):
        """Genitore (o chiunque) segna la circolare come letta."""
        circolare = self.get_object()
        LetturaCircolare.objects.get_or_create(circolare=circolare, utente=request.user)
        return Response({'letta': True})

    @action(detail=True, methods=['get'], url_path='letture')
    def letture(self, request, pk=None):
        """Admin/Direttrice vede chi ha letto la circolare."""
        if request.user.role not in (Role.ADMIN, Role.DIRETTRICE):
            return Response(status=403)
        circolare = self.get_object()
        letture = circolare.letture.select_related('utente').order_by('letto_at')
        data = [
            {
                'utente': l.utente.get_full_name() or l.utente.email,
                'letto_at': l.letto_at,
            }
            for l in letture
        ]
        return Response(data)
