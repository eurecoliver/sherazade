import threading

from datetime import date

from django.db import IntegrityError
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.config.permessi import check_permesso
from apps.users.models import Role
from .models import SessioneColloqui, PrenotazioneColloquio
from .permissions import ColloquiPermission, PrenotazionePermission, MANAGER_ROLES
from .serializers import SessioneColloquiSerializer, PrenotazioneColloquioSerializer

GENITORE = Role.GENITORE


class SessioneColloquiViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ColloquiPermission]
    serializer_class = SessioneColloquiSerializer

    def get_queryset(self):
        qs = SessioneColloqui.objects.prefetch_related('gruppi', 'prenotazioni')

        role = getattr(self.request.user, 'role', '')

        if role == GENITORE:
            # Genitori vedono solo sessioni aperte
            qs = qs.filter(aperto=True)
            # Filtra per gruppo del proprio figlio
            try:
                from apps.children.models import Famiglia
                famiglia = Famiglia.objects.filter(
                    Q(genitore1=self.request.user) | Q(genitore2=self.request.user)
                ).first()
                if famiglia:
                    gruppi_figli = list(
                        famiglia.bambini.filter(attivo=True)
                        .values_list('gruppo_id', flat=True)
                        .distinct()
                    )
                    if gruppi_figli:
                        qs = qs.filter(
                            Q(gruppi__isnull=True) | Q(gruppi__id__in=gruppi_figli)
                        ).distinct()
            except Exception:
                pass
        else:
            # Staff: filtri opzionali
            data_param = self.request.query_params.get('data')
            if data_param:
                try:
                    qs = qs.filter(data=data_param)
                except ValueError:
                    pass
            future_only = self.request.query_params.get('future')
            if future_only == '1':
                qs = qs.filter(data__gte=date.today())

        return qs.order_by('data', 'ora_inizio')

    def perform_create(self, serializer):
        serializer.save(creato_da=self.request.user)

    @action(detail=True, methods=['get'], url_path='slots')
    def slots(self, request, pk=None):
        """Restituisce tutti gli slot con disponibilità."""
        sessione = self.get_object()
        slots = sessione.get_slots()

        prenotazioni = {
            p.slot_index: p
            for p in sessione.prenotazioni.filter(disdetta=False).select_related('genitore', 'bambino')
        }

        role = getattr(request.user, 'role', '')
        is_staff = role != GENITORE

        result = []
        for slot in slots:
            idx = slot['index']
            prenotazione = prenotazioni.get(idx)
            item = {
                **slot,
                'disponibile': prenotazione is None,
            }
            if prenotazione:
                item['prenotazione_id'] = prenotazione.id
                item['disdetta'] = prenotazione.disdetta
                if is_staff:
                    # Staff vede chi ha prenotato
                    u = prenotazione.genitore
                    parts = [u.first_name, u.last_name]
                    nome = ' '.join(p for p in parts if p).strip() or u.email
                    item['genitore_nome'] = nome
                    if prenotazione.bambino:
                        b = prenotazione.bambino
                        if b.alias_attivo and b.alias_nome:
                            item['bambino_nome'] = f'{b.alias_nome} {b.cognome}'
                        else:
                            item['bambino_nome'] = f'{b.nome} {b.cognome}'
                    item['note_genitore'] = prenotazione.note_genitore
                else:
                    # Genitore vede solo se è il proprio slot
                    item['is_mine'] = prenotazione.genitore_id == request.user.pk
            result.append(item)
        return Response(result)

    @action(detail=True, methods=['patch'], url_path='toggle-aperto')
    def toggle_aperto(self, request, pk=None):
        """Apre/chiude le prenotazioni per una sessione. Solo manager."""
        if request.user.role not in MANAGER_ROLES:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        sessione = self.get_object()
        sessione.aperto = not sessione.aperto
        sessione.save(update_fields=['aperto'])
        serializer = self.get_serializer(sessione)

        # Se la sessione è stata aperta, notifica i genitori in background
        if sessione.aperto:
            threading.Thread(
                target=_notifica_sessione_aperta,
                args=(sessione,),
                daemon=True,
            ).start()

        return Response(serializer.data)


class PrenotazioneColloquioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, PrenotazionePermission]
    serializer_class = PrenotazioneColloquioSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = PrenotazioneColloquio.objects.select_related(
            'sessione', 'genitore', 'bambino'
        )

        role = getattr(self.request.user, 'role', '')
        if role == GENITORE:
            qs = qs.filter(genitore=self.request.user, disdetta=False)
        else:
            # Staff: filtra per sessione se richiesto
            sessione_param = self.request.query_params.get('sessione')
            if sessione_param:
                try:
                    qs = qs.filter(sessione_id=int(sessione_param))
                except ValueError:
                    pass

        return qs.order_by('sessione__data', 'sessione__ora_inizio', 'slot_index')

    def perform_create(self, serializer):
        sessione = serializer.validated_data.get('sessione')
        role = getattr(self.request.user, 'role', '')

        if role == GENITORE:
            # Verifica che la sessione sia aperta
            if not sessione.aperto:
                from rest_framework.exceptions import ValidationError
                raise ValidationError('Le prenotazioni per questa sessione sono chiuse.')

            # Verifica che slot_index sia nel range valido
            slot_index = serializer.validated_data.get('slot_index', -1)
            num_slots = sessione.get_num_slots()
            if not (0 <= slot_index < num_slots):
                from rest_framework.exceptions import ValidationError
                raise ValidationError(
                    f'Slot {slot_index} non valido. La sessione ha {num_slots} slot (0–{num_slots - 1}).'
                )

            # Verifica che il genitore non abbia già una prenotazione attiva per questo bambino nella stessa sessione
            bambino = serializer.validated_data.get('bambino')
            existing = PrenotazioneColloquio.objects.filter(
                sessione=sessione,
                genitore=self.request.user,
                disdetta=False,
            )
            if bambino:
                existing = existing.filter(bambino=bambino)
            if existing.exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError('Hai già una prenotazione attiva per questa sessione.')

            try:
                serializer.save(genitore=self.request.user)
            except IntegrityError:
                return Response(
                    {'detail': 'Questo slot è stato appena prenotato da un altro genitore. Scegline un altro.'},
                    status=status.HTTP_409_CONFLICT,
                )
        else:
            # Staff può creare prenotazioni per conto dei genitori
            try:
                serializer.save()
            except IntegrityError:
                return Response(
                    {'detail': 'Slot già prenotato.'},
                    status=status.HTTP_409_CONFLICT,
                )

    def destroy(self, request, *args, **kwargs):
        prenotazione = self.get_object()
        # Soft-delete: disdetta = True
        prenotazione.disdetta = True
        prenotazione.save(update_fields=['disdetta'])
        return Response(status=status.HTTP_204_NO_CONTENT)


def _notifica_sessione_aperta(sessione):
    """Invia push notification ai genitori quando una sessione viene aperta."""
    try:
        from apps.notifications.push import send_push_to_users
        from apps.children.models import Famiglia
        from apps.users.models import Role as R
        from django.db.models import Q

        # Trova tutti i genitori con bambini nei gruppi della sessione
        gruppi = list(sessione.gruppi.values_list('id', flat=True))
        if gruppi:
            famiglie = Famiglia.objects.filter(
                bambini__gruppo_id__in=gruppi,
                bambini__attivo=True,
            ).distinct()
        else:
            # Nessun gruppo specifico = tutti i genitori
            famiglie = Famiglia.objects.all()

        utenti_ids = set()
        for f in famiglie:
            if f.genitore1_id:
                utenti_ids.add(f.genitore1_id)
            if f.genitore2_id:
                utenti_ids.add(f.genitore2_id)

        if utenti_ids:
            send_push_to_users(
                user_ids=list(utenti_ids),
                title='📅 Colloqui disponibili',
                body=f'Sono aperti i colloqui: {sessione.titolo}',
                url='/dashboard/genitore/colloqui',
            )
    except Exception:
        pass
