import threading

from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.models import User, Role
from .models import TipoEvento, EventoCalendario
from .permissions import EventoPermission, TipoEventoPermission
from .serializers import TipoEventoSerializer, EventoCalendarioSerializer


def _invia_notifica_evento(evento_id: int):
    """
    Invia email + push a tutti i genitori attivi.
    Eseguita in un thread separato per non bloccare la risposta API.
    """
    try:
        evento = EventoCalendario.objects.select_related('tipo').get(pk=evento_id)

        tipo_label = str(evento.tipo) if evento.tipo else 'Evento'
        data_str = evento.data_inizio.strftime('%d/%m/%Y')
        if evento.data_fine and evento.data_fine != evento.data_inizio:
            data_str += f' – {evento.data_fine.strftime("%d/%m/%Y")}'

        # EMAIL
        genitori_email_qs = User.objects.filter(role=Role.GENITORE, is_active=True).exclude(email='')
        destinatari_email = list(genitori_email_qs.values_list('email', flat=True))
        if destinatari_email:
            soggetto = f'[Sherazade] {tipo_label}: {evento.titolo}'
            corpo = (
                f'Gentile famiglia,\n\n'
                f'Vi informiamo di un nuovo evento nel calendario scolastico:\n\n'
                f'📅 {evento.titolo}\n'
                f'Data: {data_str}\n'
            )
            if not evento.tutto_il_giorno and evento.ora_inizio:
                orario = evento.ora_inizio.strftime('%H:%M')
                if evento.ora_fine:
                    orario += f' – {evento.ora_fine.strftime("%H:%M")}'
                corpo += f'Orario: {orario}\n'
            if evento.chiusura_scolastica:
                corpo += '\n⚠️ ATTENZIONE: Il nido sarà chiuso in questa data.\n'
            if evento.descrizione:
                corpo += f'\n{evento.descrizione}\n'
            corpo += '\nCordiali saluti,\nLo staff di Sherazade'

            send_mail(
                subject=soggetto,
                message=corpo,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@sherazade.it'),
                recipient_list=destinatari_email,
                fail_silently=True,
            )

        # PUSH (sincrono — siamo già in un thread separato)
        from apps.notifications.push import send_push_to_users
        destinatari_ids = list(
            User.objects.filter(role=Role.GENITORE, is_active=True).values_list('id', flat=True)
        )
        if destinatari_ids:
            chiusura = '⚠️ Nido chiuso — ' if evento.chiusura_scolastica else ''
            push_body = f'{chiusura}{data_str}'
            if evento.descrizione:
                push_body += f': {evento.descrizione[:80]}'
            send_push_to_users(
                user_ids=destinatari_ids,
                title=f'📅 {evento.titolo}',
                body=push_body,
                url='/dashboard/genitore/calendario',
            )

        EventoCalendario.objects.filter(pk=evento_id).update(notifica_inviata=True)
    except Exception:
        pass


class TipoEventoViewSet(viewsets.ModelViewSet):
    permission_classes = [TipoEventoPermission]
    serializer_class = TipoEventoSerializer

    def get_queryset(self):
        from apps.users.models import Role
        qs = TipoEvento.objects.all()
        # non-admin vede solo tipi attivi
        if self.request.user.role not in (Role.ADMIN, Role.DIRETTRICE):
            qs = qs.filter(attivo=True)
        return qs


class EventoCalendarioViewSet(viewsets.ModelViewSet):
    permission_classes = [EventoPermission]
    serializer_class = EventoCalendarioSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['data_inizio']
    ordering = ['data_inizio']

    def get_queryset(self):
        qs = EventoCalendario.objects.select_related('tipo', 'creato_da').prefetch_related('gruppi')

        # filtro per mese
        mese = self.request.query_params.get('mese')   # formato YYYY-MM
        anno = self.request.query_params.get('anno')
        if mese:
            try:
                y, m = mese.split('-')
                qs = qs.filter(
                    Q(data_inizio__year=y, data_inizio__month=m) |
                    Q(data_fine__year=y, data_fine__month=m)
                )
            except ValueError:
                pass
        elif anno:
            qs = qs.filter(data_inizio__year=anno)

        # filtro per range date
        dal = self.request.query_params.get('dal')
        al = self.request.query_params.get('al')
        if dal:
            qs = qs.filter(Q(data_fine__gte=dal) | Q(data_fine__isnull=True, data_inizio__gte=dal))
        if al:
            qs = qs.filter(data_inizio__lte=al)

        # filtro chiusure
        chiusure = self.request.query_params.get('chiusure')
        if chiusure == '1':
            qs = qs.filter(chiusura_scolastica=True)

        return qs

    def perform_create(self, serializer):
        evento = serializer.save()
        # invia notifica in background solo se richiesto
        notifica = self.request.data.get('invia_notifica', False)
        if notifica:
            t = threading.Thread(target=_invia_notifica_evento, args=(evento.pk,), daemon=True)
            t.start()

    @action(detail=False, methods=['get'], url_path='chiusure')
    def chiusure(self, request):
        """Restituisce tutte le date di chiusura scolastica (per presenze)."""
        dal = request.query_params.get('dal')
        al = request.query_params.get('al')
        qs = EventoCalendario.objects.filter(chiusura_scolastica=True)
        if dal:
            qs = qs.filter(data_inizio__gte=dal)
        if al:
            qs = qs.filter(data_inizio__lte=al)
        data = qs.values('id', 'titolo', 'data_inizio', 'data_fine')
        return Response(list(data))
