import threading
from datetime import date

from django.db import transaction, IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.users.models import Role, User
from .models import ConfigurazioneIscrizioni, RichiestaIscrizione
from .permissions import IscrizioniPublicPermission, ConfigPermission, MANAGER_ROLES
from .serializers import (
    ConfigurazioneIscrizioniSerializer,
    RichiestaIscrizioneSerializer,
    RichiestaIscrizioneWriteSerializer,
)


def _get_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')


def _invia_email_conferma(g1_email, g1_nome, bambino_nome, anno):
    """Invia email di conferma ricezione iscrizione (non bloccante)."""
    from django.core.mail import send_mail
    from django.conf import settings
    try:
        send_mail(
            subject=f'Richiesta di iscrizione ricevuta — {bambino_nome}',
            message=(
                f'Gentile {g1_nome},\n\n'
                f'abbiamo ricevuto la tua richiesta di iscrizione per {bambino_nome} '
                f'per l\'anno scolastico {anno}.\n\n'
                f'Ti contatteremo appena la richiesta sarà esaminata.\n\n'
                f'Grazie,\nLo staff del nido'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[g1_email],
            fail_silently=True,
        )
    except Exception:
        pass


class ConfigurazioneIscrizioniViewSet(viewsets.ViewSet):
    permission_classes = [ConfigPermission]

    def list(self, request):
        cfg = ConfigurazioneIscrizioni.get_config()
        return Response(ConfigurazioneIscrizioniSerializer(cfg).data)

    def partial_update(self, request, pk=None):
        cfg = ConfigurazioneIscrizioni.get_config()
        s = ConfigurazioneIscrizioniSerializer(cfg, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class RichiestaIscrizioneViewSet(viewsets.ModelViewSet):
    pagination_class = None

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return RichiestaIscrizioneWriteSerializer
        return RichiestaIscrizioneSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return RichiestaIscrizione.objects.none()
        if user.role not in MANAGER_ROLES:
            return RichiestaIscrizione.objects.none()
        qs = RichiestaIscrizione.objects.select_related('assegnato_a', 'bambino')
        # Filtri
        stato = self.request.query_params.get('stato')
        if stato:
            qs = qs.filter(stato=stato)
        anno = self.request.query_params.get('anno')
        if anno:
            qs = qs.filter(anno_scolastico=anno)
        return qs

    def create(self, request, *args, **kwargs):
        """Endpoint pubblico: invia una richiesta di iscrizione."""
        cfg = ConfigurazioneIscrizioni.get_config()
        if not cfg.aperto:
            return Response(
                {'detail': cfg.messaggio_chiuso or 'Le iscrizioni sono chiuse.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        s = RichiestaIscrizioneWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        richiesta = s.save(
            anno_scolastico=cfg.anno_scolastico,
            ip_address=_get_ip(request),
        )
        # Email di conferma in background
        if cfg.invia_email_conferma:
            threading.Thread(
                target=_invia_email_conferma,
                args=(
                    richiesta.g1_email,
                    richiesta.g1_nome,
                    f'{richiesta.bambino_nome} {richiesta.bambino_cognome}',
                    richiesta.anno_scolastico,
                ),
                daemon=True,
            ).start()
        return Response(
            {'detail': 'Richiesta inviata con successo. Riceverai una conferma via email.'},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        """Staff: aggiorna stato, note_admin, assegnato_a."""
        user = request.user
        if user.role not in MANAGER_ROLES:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        allowed = {'stato', 'note_admin', 'assegnato_a'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        # Blocca l'impostazione diretta di 'approvata' — usare l'action /approva/ dedicata
        if data.get('stato') == RichiestaIscrizione.Stato.APPROVATA:
            return Response(
                {'detail': 'Usa il pulsante "Approva" per approvare una richiesta (crea bambino e famiglia).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        s = RichiestaIscrizioneSerializer(instance, data=data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)

    @action(detail=True, methods=['post'], url_path='approva')
    def approva(self, request, pk=None):
        """
        Admin/Direttrice: approva la richiesta e crea automaticamente
        Bambino + Famiglia + User(s) se non esistono ancora.
        """
        user = request.user
        if user.role not in (Role.ADMIN, Role.DIRETTRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        richiesta = self.get_object()
        if richiesta.stato == RichiestaIscrizione.Stato.APPROVATA:
            return Response({'detail': 'Richiesta già approvata.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.children.models import Bambino, Famiglia

        return self._approva_atomic(request, richiesta)

    def _approva_atomic(self, request, richiesta):
        from apps.children.models import Bambino, Famiglia

        cf = richiesta.bambino_codice_fiscale.strip().upper()
        try:
            with transaction.atomic():
                # Crea o recupera User genitore 1 (dentro la transazione)
                try:
                    g1 = User.objects.get(email__iexact=richiesta.g1_email)
                    if not g1.first_name:
                        g1.first_name = richiesta.g1_nome
                        g1.last_name = richiesta.g1_cognome
                        g1.save(update_fields=['first_name', 'last_name'])
                except User.DoesNotExist:
                    g1 = User(
                        username=richiesta.g1_email,
                        email=richiesta.g1_email,
                        first_name=richiesta.g1_nome,
                        last_name=richiesta.g1_cognome,
                        role=Role.GENITORE,
                        is_active=True,
                    )
                    g1.set_unusable_password()
                    g1.save()

                # Crea o recupera User genitore 2 (se presente, dentro la transazione)
                g2 = None
                if richiesta.g2_email:
                    try:
                        g2 = User.objects.get(email__iexact=richiesta.g2_email)
                    except User.DoesNotExist:
                        g2 = User(
                            username=richiesta.g2_email,
                            email=richiesta.g2_email,
                            first_name=richiesta.g2_nome,
                            last_name=richiesta.g2_cognome,
                            role=Role.GENITORE,
                            is_active=True,
                        )
                        g2.set_unusable_password()
                        g2.save()

                # Crea Bambino + Famiglia
                bambino = Bambino.objects.create(
                    nome=richiesta.bambino_nome,
                    cognome=richiesta.bambino_cognome,
                    data_nascita=richiesta.bambino_data_nascita,
                    codice_fiscale=cf if cf else '',
                    note_mediche=richiesta.bambino_note_mediche or '',
                    data_iscrizione=date.today(),
                    attivo=True,
                )
                Famiglia.objects.create(
                    bambino=bambino,
                    genitore1=g1,
                    genitore2=g2,
                    genitore1_codice_fiscale=richiesta.g1_codice_fiscale or '',
                    genitore1_indirizzo=richiesta.g1_indirizzo or '',
                    telefono_emergenza=richiesta.g1_telefono or '',
                )
                richiesta.stato = RichiestaIscrizione.Stato.APPROVATA
                richiesta.bambino = bambino
                richiesta.save(update_fields=['stato', 'bambino', 'aggiornato_at'])
        except IntegrityError:
            return Response(
                {'detail': 'Esiste già un bambino con questo codice fiscale. Verifica l\'anagrafica e, se necessario, collega manualmente il bambino.'},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            RichiestaIscrizioneSerializer(richiesta).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], url_path='config-pubblica',
            permission_classes=[AllowAny])
    def config_pubblica(self, request):
        """Endpoint pubblico: restituisce config visibile al form (aperto, messaggio, anno)."""
        cfg = ConfigurazioneIscrizioni.get_config()
        return Response({
            'aperto': cfg.aperto,
            'anno_scolastico': cfg.anno_scolastico,
            'messaggio_benvenuto': cfg.messaggio_benvenuto,
            'messaggio_chiuso': cfg.messaggio_chiuso,
            'data_apertura': cfg.data_apertura,
            'data_chiusura': cfg.data_chiusura,
        })
