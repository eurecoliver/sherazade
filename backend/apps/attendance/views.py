import calendar
from datetime import date, datetime as dt
from django.db import IntegrityError
from django.db.models import Avg, Count, Q, Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.children.models import Bambino
from apps.users.models import Role, User
from apps.config.permessi import check_permesso
from apps.audit.mixin import LogAccessoMixin
from .models import (
    Presenza,
    PresenzaInsegnante,
    DailyQRCodeToken,
    DailyQRCodeTokenInsegnanti,
    ConfigurazioneCheckin,
)
from .permissions import PresenzaPermission
from .serializers import (
    PresenzaSerializer, PresenzaWriteSerializer,
    PresenzaInsegnanteSerializer, PresenzaInsegnanteWriteSerializer,
    DailyQRCodeTokenSerializer,
    DailyQRCodeTokenInsegnantiSerializer,
    ConfigurazioneCheckinSerializer,
)


class PresenzaViewSet(LogAccessoMixin, viewsets.ModelViewSet):
    risorsa_nome = 'presenza'
    permission_classes = [IsAuthenticated, PresenzaPermission]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return PresenzaWriteSerializer
        return PresenzaSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Presenza.objects.select_related(
            'bambino__famiglia__genitore1',
            'bambino__famiglia__genitore2',
            'registrato_da',
        )
        if user.role == Role.GENITORE:
            return qs.filter(
                Q(bambino__famiglia__genitore1=user)
                | Q(bambino__famiglia__genitore2=user)
            )
        params = self.request.query_params
        if bambino_id := params.get('bambino'):
            qs = qs.filter(bambino_id=bambino_id)
        if data_param := params.get('data'):
            qs = qs.filter(data=data_param)
        if gruppo := params.get('gruppo'):
            qs = qs.filter(bambino__gruppo_id=gruppo)
        elif sezione := params.get('sezione'):
            qs = qs.filter(bambino__gruppo__nome__iexact=sezione)
        return qs

    def perform_create(self, serializer):
        serializer.save(registrato_da=self.request.user)

    def perform_update(self, serializer):
        serializer.save(registrato_da=self.request.user)

    # ─── Staff/Admin ──────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def giornata(self, request):
        """
        Staff/Admin: lista bambini con la loro presenza del giorno.
        Parametri: data (default oggi), sezione (opzionale).
        """
        data_str = request.query_params.get('data', str(date.today()))
        gruppo = request.query_params.get('gruppo', '')
        sezione = request.query_params.get('sezione', '')

        bambini_qs = (
            Bambino.objects
            .filter(attivo=True)
            .select_related('gruppo', 'orario_uscita')
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo)
        elif sezione:
            bambini_qs = bambini_qs.filter(gruppo__nome__iexact=sezione)

        presenze = {
            p.bambino_id: p
            for p in Presenza.objects.filter(data=data_str).select_related('registrato_da')
        }

        result = []
        for b in bambini_qs:
            presenza = presenze.get(b.id)
            orario_uscita_previsto = None
            try:
                if b.orario_uscita:
                    orario_uscita_previsto = b.orario_uscita.orario.strftime('%H:%M')
            except Exception:
                pass
            result.append({
                'bambino': {
                    'id': b.id,
                    'nome': b.nome,
                    'cognome': b.cognome,
                    'sezione': b.sezione,
                    'orario_uscita_previsto': orario_uscita_previsto,
                },
                'presenza': PresenzaSerializer(presenza).data if presenza else None,
            })

        return Response(result)

    @action(detail=False, methods=['post'])
    def salva_giornata(self, request):
        """
        Salva (crea o aggiorna) le presenze di tutti i bambini in un unico POST.
        Body: { data: "YYYY-MM-DD", presenze: [ { bambino, presente, ora_arrivo, motivo_assenza, note }, ... ] }
        """
        data_str = request.data.get('data', str(date.today()))
        presenze_data = request.data.get('presenze', [])
        if not isinstance(presenze_data, list):
            return Response(
                {'detail': 'Campo "presenze" deve essere una lista.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        saved, errors = [], []
        for item in presenze_data:
            bambino_id = item.get('bambino')
            if bambino_id is None or item.get('presente') is None:
                continue
            defaults = {
                'presente': item['presente'],
                'ora_arrivo': item.get('ora_arrivo') or None,
                'ora_uscita': item.get('ora_uscita') or None,
                'assenza_comunicata': item.get('assenza_comunicata', False),
                'motivo_assenza': item.get('motivo_assenza', ''),
                'note': item.get('note', ''),
                'registrato_da': request.user,
            }
            try:
                obj, created = Presenza.objects.get_or_create(
                    bambino_id=bambino_id,
                    data=data_str,
                    defaults=defaults,
                )
                if not created:
                    for k, v in defaults.items():
                        setattr(obj, k, v)
                    obj.save()  # triggera _calcola_ritardi()
                saved.append(obj.id)
            except Exception as e:
                errors.append({'bambino': bambino_id, 'errore': str(e)})

        return Response({'salvati': len(saved), 'errori': errors})

    @action(detail=False, methods=['get'])
    def non_arrivati(self, request):
        """
        Admin/Direttrice/Coordinatrice: bambini attivi senza registro presenza per la data indicata.
        Flag di alert mattutino.
        """
        role = request.user.role
        if role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        data_str = request.query_params.get('data', str(date.today()))
        gruppo = request.query_params.get('gruppo', '')
        sezione = request.query_params.get('sezione', '')

        bambini_qs = (
            Bambino.objects.filter(attivo=True)
            .select_related('gruppo')
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo)
        elif sezione:
            bambini_qs = bambini_qs.filter(gruppo__nome__iexact=sezione)

        bambini_con_registro = set(
            Presenza.objects.filter(data=data_str).values_list('bambino_id', flat=True)
        )

        non_arrivati = [
            {'id': b.id, 'nome': b.nome, 'cognome': b.cognome, 'sezione': b.sezione}
            for b in bambini_qs
            if b.id not in bambini_con_registro
        ]

        return Response({
            'data': data_str,
            'totale_attivi': bambini_qs.count(),
            'con_registro': len(bambini_con_registro),
            'non_arrivati': non_arrivati,
        })

    @action(detail=False, methods=['get'])
    def report_mensile(self, request):
        """
        Admin/Direttrice: report mensile presenze per bambino — base per export PDF.
        Parametri: anno, mese, sezione (opzionale).
        """
        role = request.user.role
        if role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi = date.today()
        anno = int(request.query_params.get('anno', oggi.year))
        mese = int(request.query_params.get('mese', oggi.month))
        gruppo = request.query_params.get('gruppo', '')
        sezione = request.query_params.get('sezione', '')

        bambini_qs = (
            Bambino.objects.filter(attivo=True)
            .select_related('gruppo')
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo)
        elif sezione:
            bambini_qs = bambini_qs.filter(gruppo__nome__iexact=sezione)

        presenze_mese = Presenza.objects.filter(data__year=anno, data__month=mese)
        mappa: dict[int, list] = {}
        for p in presenze_mese:
            mappa.setdefault(p.bambino_id, []).append(p)

        _, giorni_nel_mese = calendar.monthrange(anno, mese)

        result = []
        for b in bambini_qs:
            pres = mappa.get(b.id, [])
            giorni_presenti = sum(1 for p in pres if p.presente)
            giorni_assenti = sum(1 for p in pres if not p.presente)
            result.append({
                'bambino_id': b.id,
                'nome': b.nome,
                'cognome': b.cognome,
                'sezione': b.sezione,
                'giorni_presenti': giorni_presenti,
                'giorni_assenti': giorni_assenti,
                'giorni_non_registrati': giorni_nel_mese - giorni_presenti - giorni_assenti,
                'percentuale_presenza': round(giorni_presenti / giorni_nel_mese * 100) if giorni_nel_mese else 0,
            })

        return Response({
            'anno': anno,
            'mese': mese,
            'giorni_nel_mese': giorni_nel_mese,
            'bambini': result,
        })

    @action(detail=False, methods=['get'], url_path='insegnanti-giornata')
    def insegnanti_giornata(self, request):
        """
        Registro presenze insegnanti per la giornata corrente.
        - Admin/Direttrice/Coordinatrice: lista completa insegnanti
        - Insegnante: solo la propria riga
        """
        if not check_permesso(request.user, 'presenze', 'leggi'):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        role = request.user.role
        data_str = request.query_params.get('data', str(date.today()))
        insegnanti_qs = User.objects.filter(role=Role.INSEGNANTE, is_active=True).order_by('last_name', 'first_name')
        if role == Role.INSEGNANTE:
            insegnanti_qs = insegnanti_qs.filter(pk=request.user.pk)

        presenze = {
            p.insegnante_id: p
            for p in PresenzaInsegnante.objects.filter(data=data_str, insegnante__in=insegnanti_qs)
        }

        result = []
        for user in insegnanti_qs:
            presenza = presenze.get(user.pk)
            stato = 'nessuno'
            if presenza:
                stato = 'uscita_registrata' if presenza.ora_uscita else 'entrata_registrata'
            result.append({
                'insegnante_id': user.pk,
                'nome': user.first_name,
                'cognome': user.last_name,
                'email': user.email,
                'stato': stato,
                'presenza': PresenzaInsegnanteSerializer(presenza).data if presenza else None,
            })

        return Response({'data': data_str, 'insegnanti': result})

    # ─── Cuoca ────────────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def presenti_oggi(self, request):
        """Cuoca: contatore bambini presenti oggi per calibrare le porzioni."""
        oggi = date.today()
        gruppo = request.query_params.get('gruppo', '')
        qs = Presenza.objects.filter(data=oggi, presente=True)
        if gruppo:
            qs = qs.filter(bambino__gruppo_id=gruppo)
        return Response({'data': str(oggi), 'presenti': qs.count()})

    # ─── Genitore ─────────────────────────────────────────────────────────────

    @action(detail=False, methods=['post'])
    def comunica_assenza(self, request):
        """
        Genitore: comunica assenza del proprio figlio per oggi.
        Body: { bambino_id, motivo_assenza, note }
        """
        if request.user.role != Role.GENITORE:
            return Response({'detail': 'Riservato ai genitori.'}, status=status.HTTP_403_FORBIDDEN)

        bambino_id = request.data.get('bambino_id')
        if not bambino_id:
            return Response(
                {'detail': 'Campo "bambino_id" obbligatorio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        try:
            bambino = Bambino.objects.select_related(
                'famiglia__genitore1', 'famiglia__genitore2'
            ).get(id=bambino_id)
            famiglia = bambino.famiglia
            if famiglia.genitore1_id != user.pk and famiglia.genitore2_id != user.pk:
                return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi = date.today()
        motivo = request.data.get('motivo_assenza', Presenza.MotivoAssenza.ALTRO)
        note = request.data.get('note', '')

        presenza, created = Presenza.objects.get_or_create(
            bambino_id=bambino_id,
            data=oggi,
            defaults={
                'presente': False,
                'assenza_comunicata': True,
                'motivo_assenza': motivo,
                'note': note,
                'registrato_da': user,
            },
        )

        if not created:
            if presenza.presente:
                return Response(
                    {'detail': 'Il bambino è già registrato come presente oggi.'},
                    status=status.HTTP_409_CONFLICT,
                )
            presenza.assenza_comunicata = True
            presenza.motivo_assenza = motivo
            presenza.note = note
            presenza.save(update_fields=['assenza_comunicata', 'motivo_assenza', 'note'])

        return Response(PresenzaSerializer(presenza).data)

    @action(detail=False, methods=['get'])
    def mio_figlio(self, request):
        """
        Genitore: storico presenze del proprio figlio + statistiche mese corrente.
        Parametri: bambino (obbligatorio).
        """
        if request.user.role != Role.GENITORE:
            return Response({'detail': 'Riservato ai genitori.'}, status=status.HTTP_403_FORBIDDEN)

        bambino_id = request.query_params.get('bambino')
        user = request.user

        if not bambino_id:
            # Fallback: tutte le presenze dei bambini visibili al genitore
            qs = (
                Presenza.objects
                .filter(
                    Q(bambino__famiglia__genitore1=user)
                    | Q(bambino__famiglia__genitore2=user)
                )
                .select_related('registrato_da')
                .order_by('-data')
            )
            return Response({'presenze': PresenzaSerializer(qs, many=True).data, 'stats_mese': None})

        try:
            bambino = Bambino.objects.select_related(
                'famiglia__genitore1', 'famiglia__genitore2'
            ).get(id=bambino_id)
            famiglia = bambino.famiglia
            if famiglia.genitore1_id != user.pk and famiglia.genitore2_id != user.pk:
                return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        presenze = (
            Presenza.objects
            .filter(bambino_id=bambino_id)
            .select_related('registrato_da')
            .order_by('-data')[:60]
        )

        oggi = date.today()
        presenze_mese = Presenza.objects.filter(
            bambino_id=bambino_id,
            data__year=oggi.year,
            data__month=oggi.month,
        )
        giorni_presenti = presenze_mese.filter(presente=True).count()
        giorni_assenti = presenze_mese.filter(presente=False).count()

        return Response({
            'presenze': PresenzaSerializer(presenze, many=True).data,
            'stats_mese': {
                'anno': oggi.year,
                'mese': oggi.month,
                'giorni_presenti': giorni_presenti,
                'giorni_assenti': giorni_assenti,
            },
        })

    # ─── QR Check-in ──────────────────────────────────────────────────────────

    @action(detail=False, methods=['get', 'patch'], url_path='qr-config')
    def qr_config(self, request):
        """
        Admin/Direttrice: legge o modifica la configurazione globale del QR check-in.
        GET  → { qr_abilitato: bool }
        PATCH → { qr_abilitato: bool }
        """
        config = ConfigurazioneCheckin.get()
        if request.method == 'PATCH':
            if request.user.role not in (Role.ADMIN, Role.DIRETTRICE):
                return Response({'detail': 'Riservato ad Admin/Direttrice.'}, status=status.HTTP_403_FORBIDDEN)
            serializer = ConfigurazioneCheckinSerializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(ConfigurazioneCheckinSerializer(config).data)

    @action(detail=False, methods=['get', 'post'], url_path='qr-token')
    def qr_token(self, request):
        """
        Staff/Admin: restituisce il token QR di oggi. POST forza il rinnovo del token.
        Richiede che il QR check-in sia abilitato.
        """
        if not ConfigurazioneCheckin.get().qr_abilitato:
            return Response({'detail': 'QR check-in disabilitato.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'POST':
            token_obj = DailyQRCodeToken.rinnova_oggi(user=request.user)
        else:
            token_obj, _ = DailyQRCodeToken.get_or_create_today(user=request.user)

        return Response(DailyQRCodeTokenSerializer(token_obj).data)

    @action(detail=False, methods=['get', 'post'], url_path='qr-token-insegnanti')
    def qr_token_insegnanti(self, request):
        """
        Staff/Admin: restituisce il token QR insegnanti di oggi.
        POST forza il rinnovo del token.
        """
        if request.user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        config = ConfigurazioneCheckin.get()
        if not config.qr_insegnanti_abilitato:
            return Response({'detail': 'QR check-in insegnanti disabilitato.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'POST':
            token_obj = DailyQRCodeTokenInsegnanti.rinnova_oggi(user=request.user)
        else:
            token_obj, _ = DailyQRCodeTokenInsegnanti.get_or_create_today(user=request.user)

        return Response(DailyQRCodeTokenInsegnantiSerializer(token_obj).data)

    @action(detail=False, methods=['get'], url_path='checkin-info')
    def checkin_info(self, request):
        """
        Genitore (o qualsiasi utente loggato): valida il token e restituisce
        i propri figli con lo stato presenza odierna.
        Query param: ?token=XXX
        """
        if not ConfigurazioneCheckin.get().qr_abilitato:
            return Response({'detail': 'QR check-in disabilitato.'}, status=status.HTTP_403_FORBIDDEN)

        token = request.query_params.get('token', '')
        if not token or not DailyQRCodeToken.valida(token):
            return Response({'detail': 'Token non valido o scaduto.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        bambini_qs = (
            Bambino.objects
            .filter(
                Q(famiglia__genitore1=user) | Q(famiglia__genitore2=user),
                attivo=True,
            )
            .select_related('gruppo', 'orario_uscita')
        )

        oggi_str = str(date.today())
        presenze_oggi = {
            p.bambino_id: p
            for p in Presenza.objects.filter(
                bambino__in=bambini_qs, data=oggi_str
            )
        }

        result = []
        for b in bambini_qs:
            presenza = presenze_oggi.get(b.id)
            stato = 'nessuno'
            if presenza:
                if presenza.ora_uscita:
                    stato = 'uscito'
                elif presenza.presente:
                    stato = 'presente'
                else:
                    stato = 'assente'

            result.append({
                'bambino_id': b.id,
                'nome': b.display_name if hasattr(b, 'display_name') else b.nome,
                'cognome': b.cognome,
                'gruppo': b.sezione,
                'stato': stato,
                'ora_arrivo': presenza.ora_arrivo.strftime('%H:%M') if presenza and presenza.ora_arrivo else None,
                'ora_uscita': presenza.ora_uscita.strftime('%H:%M') if presenza and presenza.ora_uscita else None,
            })

        return Response({'figli': result, 'data': oggi_str})

    @action(detail=False, methods=['get'], url_path='checkin-info-insegnanti')
    def checkin_info_insegnanti(self, request):
        """
        Insegnante: valida il token e restituisce il proprio stato presenza odierno.
        """
        if request.user.role not in (Role.INSEGNANTE, Role.COORDINATRICE, Role.DIRETTRICE, Role.ADMIN):
            return Response({'detail': 'Riservato allo staff.'}, status=status.HTTP_403_FORBIDDEN)

        config = ConfigurazioneCheckin.get()
        if not config.qr_insegnanti_abilitato:
            return Response({'detail': 'QR check-in insegnanti disabilitato.'}, status=status.HTTP_403_FORBIDDEN)

        token = request.query_params.get('token', '')
        if not token or not DailyQRCodeTokenInsegnanti.valida(token):
            return Response({'detail': 'Token non valido o scaduto.'}, status=status.HTTP_400_BAD_REQUEST)

        oggi_str = str(date.today())
        presenza = PresenzaInsegnante.objects.filter(insegnante=request.user, data=oggi_str).first()
        stato = 'nessuno'
        if presenza:
            stato = 'uscita_registrata' if presenza.ora_uscita else 'entrata_registrata'

        return Response({
            'data': oggi_str,
            'insegnante': {
                'id': request.user.pk,
                'nome': request.user.first_name,
                'cognome': request.user.last_name,
                'email': request.user.email,
            },
            'stato': stato,
            'presenza': PresenzaInsegnanteSerializer(presenza).data if presenza else None,
        })

    @action(detail=False, methods=['post'], url_path='perform-checkin')
    def perform_checkin(self, request):
        """
        Genitore: registra arrivo o uscita tramite QR.
        Body: { token, bambino_id }
        Logica auto: nessun arrivo → registra arrivo; arrivo senza uscita → registra uscita; entrambi → errore.
        """
        if not ConfigurazioneCheckin.get().qr_abilitato:
            return Response({'detail': 'QR check-in disabilitato.'}, status=status.HTTP_403_FORBIDDEN)

        token = request.data.get('token', '')
        bambino_id = request.data.get('bambino_id')

        if not token or not DailyQRCodeToken.valida(token):
            return Response({'detail': 'Token non valido o scaduto.'}, status=status.HTTP_400_BAD_REQUEST)

        if not bambino_id:
            return Response({'detail': 'Campo "bambino_id" obbligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verifica parentela
        user = request.user
        try:
            bambino = Bambino.objects.select_related(
                'famiglia__genitore1', 'famiglia__genitore2'
            ).get(id=bambino_id, attivo=True)
            famiglia = bambino.famiglia
            if famiglia.genitore1_id != user.pk and famiglia.genitore2_id != user.pk:
                return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi_str = date.today()
        ora_ora = dt.now().time().replace(second=0, microsecond=0)

        presenza, created = Presenza.objects.get_or_create(
            bambino_id=bambino_id,
            data=oggi_str,
            defaults={
                'presente': True,
                'ora_arrivo': ora_ora,
                'via_qr': True,
                'registrato_da': user,
            },
        )

        if created:
            azione = 'arrivo'
        elif not presenza.presente:
            # Era segnato assente: non sovrascrivere senza conferma
            return Response(
                {'detail': f'{bambino.nome} è già segnato assente oggi. Contatta lo staff per correggere.'},
                status=status.HTTP_409_CONFLICT,
            )
        elif presenza.ora_arrivo is None:
            presenza.ora_arrivo = ora_ora
            presenza.presente = True
            presenza.via_qr = True
            presenza.registrato_da = user
            presenza.save()
            azione = 'arrivo'
        elif presenza.ora_uscita is None:
            presenza.ora_uscita = ora_ora
            presenza.via_qr = True
            presenza.registrato_da = user
            presenza.save()
            azione = 'uscita'
        else:
            return Response(
                {'detail': f'{bambino.nome} è già stato registrato in entrata e uscita oggi.'},
                status=status.HTTP_409_CONFLICT,
            )

        # Push notification allo staff
        import threading
        def _push():
            try:
                from apps.notifications.push import send_push_to_users
                from apps.users.models import User as UserModel
                staff_ids = list(
                    UserModel.objects.filter(
                        is_active=True,
                        role__in=[Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE],
                    ).values_list('id', flat=True)
                )
                orario = ora_ora.strftime('%H:%M')
                verbo = 'è arrivato/a' if azione == 'arrivo' else 'è uscito/a'
                send_push_to_users(
                    staff_ids,
                    title=f'QR Check-in — {bambino.nome} {verbo}',
                    body=f'{bambino.nome} {bambino.cognome} {verbo} alle {orario}',
                    url='/it/dashboard/staff/presenze',
                )
            except Exception:
                pass
        threading.Thread(target=_push, daemon=True).start()

        return Response({
            'azione': azione,
            'bambino': bambino.nome,
            'ora': ora_ora.strftime('%H:%M'),
            'presenza': PresenzaSerializer(presenza).data,
        })

    @action(detail=False, methods=['get'], url_path='storico-insegnanti')
    def storico_insegnanti(self, request):
        """
        Storico presenze insegnanti.
        - Insegnante/Coordinatrice: solo il proprio storico
        - Admin/Direttrice con ?insegnante_id=N: storico di quella insegnante
        - Admin/Direttrice senza insegnante_id: tutti (ultimi 100 record, modalità registro)
        """
        if not check_permesso(request.user, 'presenze', 'leggi'):
            return Response({'detail': 'Riservato allo staff.'}, status=status.HTTP_403_FORBIDDEN)

        insegnante_id = request.query_params.get('insegnante_id')

        if request.user.role in (Role.ADMIN, Role.DIRETTRICE):
            if insegnante_id:
                presenze_qs = PresenzaInsegnante.objects.filter(insegnante_id=insegnante_id)
            else:
                # Nessun filtro → tutti (modalità registro completo)
                presenze_qs = PresenzaInsegnante.objects.all()
        else:
            presenze_qs = PresenzaInsegnante.objects.filter(insegnante_id=request.user.pk)

        presenze = (
            presenze_qs
            .select_related('insegnante', 'registrato_da')
            .order_by('-data', 'insegnante__last_name', 'insegnante__first_name')[:100]
        )

        oggi = date.today()
        stats_qs = presenze_qs.filter(data__year=oggi.year, data__month=oggi.month)
        giorni_presenti = stats_qs.filter(presente=True).count()
        giorni_assenti = stats_qs.filter(presente=False).count()

        return Response({
            'presenze': PresenzaInsegnanteSerializer(presenze, many=True).data,
            'stats_mese': {
                'mese': oggi.strftime('%B %Y'),
                'giorni_presenti': giorni_presenti,
                'giorni_assenti': giorni_assenti,
                'totale_giorni': giorni_presenti + giorni_assenti,
            },
        })

    @action(detail=False, methods=['post'], url_path='crea-assenza-insegnante')
    def crea_assenza_insegnante(self, request):
        """
        Admin/Direttrice: crea manualmente un record di assenza per un'insegnante.
        Body: { insegnante, data, motivo_assenza }
        """
        if not check_permesso(request.user, 'presenze', 'scrivi'):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PresenzaInsegnanteWriteSerializer(data=request.data)
        if serializer.is_valid():
            try:
                obj = serializer.save(registrato_da=request.user, presente=False)
            except IntegrityError:
                return Response(
                    {'detail': 'Esiste già un record per questa insegnante in questa data. Usa il salvataggio manuale per aggiornarlo.'},
                    status=status.HTTP_409_CONFLICT,
                )
            return Response(PresenzaInsegnanteSerializer(obj).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['delete'], url_path='elimina-presenza-insegnante/(?P<pid>[0-9]+)')
    def elimina_presenza_insegnante(self, request, pid=None):
        """
        Admin/Direttrice (o ruoli con permesso scrivi): elimina un record
        PresenzaInsegnante per ID.
        """
        if not check_permesso(request.user, 'presenze', 'scrivi'):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            presenza = PresenzaInsegnante.objects.get(pk=pid)
        except PresenzaInsegnante.DoesNotExist:
            return Response({'detail': 'Record non trovato.'}, status=status.HTTP_404_NOT_FOUND)
        presenza.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='salva-insegnante-manuale')
    def salva_insegnante_manuale(self, request):
        """
        Admin/Direttrice (o ruoli con permesso scrivi): crea/aggiorna manualmente
        la presenza insegnante per una data specifica.
        Body: {
          insegnante, data, presente, motivo_assenza?, ora_entrata?, ora_uscita?
        }
        """
        if not check_permesso(request.user, 'presenze', 'scrivi'):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PresenzaInsegnanteWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        insegnante = validated['insegnante']
        data_val = validated['data']
        presente = validated.get('presente', True)

        defaults = {
            'presente': presente,
            'motivo_assenza': validated.get('motivo_assenza', ''),
            'ora_entrata': validated.get('ora_entrata'),
            'ora_uscita': validated.get('ora_uscita'),
            'registrato_da': request.user,
        }

        # Se assente, gli orari non devono essere valorizzati.
        if not presente:
            defaults['ora_entrata'] = None
            defaults['ora_uscita'] = None
            if not defaults['motivo_assenza']:
                defaults['motivo_assenza'] = PresenzaInsegnante.MotivoAssenza.ALTRO
        else:
            defaults['motivo_assenza'] = ''

        obj, created = PresenzaInsegnante.objects.get_or_create(
            insegnante=insegnante,
            data=data_val,
            defaults=defaults,
        )

        if not created:
            for key, value in defaults.items():
                setattr(obj, key, value)
            obj.save(update_fields=[
                'presente',
                'motivo_assenza',
                'ora_entrata',
                'ora_uscita',
                'registrato_da',
                'aggiornato_at',
            ])

        return Response({
            'created': created,
            'presenza': PresenzaInsegnanteSerializer(obj).data,
        })

    @action(detail=False, methods=['post'], url_path='perform-checkin-insegnanti')
    def perform_checkin_insegnanti(self, request):
        """
        Insegnante: registra entrata o uscita tramite QR.
        Body: { token }
        """
        if request.user.role not in (Role.INSEGNANTE, Role.COORDINATRICE, Role.DIRETTRICE, Role.ADMIN):
            return Response({'detail': 'Riservato allo staff.'}, status=status.HTTP_403_FORBIDDEN)

        config = ConfigurazioneCheckin.get()
        if not config.qr_insegnanti_abilitato:
            return Response({'detail': 'QR check-in insegnanti disabilitato.'}, status=status.HTTP_403_FORBIDDEN)

        token = request.data.get('token', '')
        if not token or not DailyQRCodeTokenInsegnanti.valida(token):
            return Response({'detail': 'Token non valido o scaduto.'}, status=status.HTTP_400_BAD_REQUEST)

        oggi = date.today()
        ora_ora = dt.now().time().replace(second=0, microsecond=0)

        presenza, created = PresenzaInsegnante.objects.get_or_create(
            insegnante=request.user,
            data=oggi,
            defaults={
                'presente': True,
                'ora_entrata': ora_ora,
                'via_qr': True,
                'registrato_da': request.user,
            },
        )

        # Se segnato assente, non permettere il checkin automatico
        if not created and not presenza.presente:
            return Response(
                {'detail': 'Sei già segnato assente oggi. Contatta lo staff per correggere.'},
                status=status.HTTP_409_CONFLICT,
            )

        if created:
            azione = 'entrata'
        elif presenza.ora_entrata is None:
            presenza.ora_entrata = ora_ora
            presenza.via_qr = True
            presenza.registrato_da = request.user
            presenza.save(update_fields=['ora_entrata', 'via_qr', 'registrato_da', 'aggiornato_at'])
            azione = 'entrata'
        elif presenza.ora_uscita is None:
            presenza.ora_uscita = ora_ora
            presenza.via_qr = True
            presenza.registrato_da = request.user
            presenza.save(update_fields=['ora_uscita', 'via_qr', 'registrato_da', 'aggiornato_at'])
            azione = 'uscita'
        else:
            return Response(
                {'detail': 'Hai gia registrato entrata e uscita per oggi.'},
                status=status.HTTP_409_CONFLICT,
            )

        return Response({
            'azione': azione,
            'ora': ora_ora.strftime('%H:%M'),
            'presenza': PresenzaInsegnanteSerializer(presenza).data,
        })

    # ── Bacheca live ─────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='statistiche')
    def statistiche(self, request):
        """
        Dashboard statistiche presenze — admin/direttrice/coordinatrice.
        Parametri:
          anno=YYYY (default anno corrente)
          gruppo=<id> (opzionale, filtra per gruppo)
        Ritorna:
          - trend mensile (presenti/assenti/perc_presenza per mese)
          - media ritardo arrivo/uscita mensile (minuti)
          - riepilogo per gruppo (presenti, assenti, perc_presenza — anno)
          - top 10 bambini per giorni assenti nell'anno
        """
        role = request.user.role
        from apps.config.permessi import check_permesso
        if not check_permesso(request.user, 'presenze', 'leggi'):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi = date.today()
        anno = int(request.query_params.get('anno', oggi.year))
        gruppo_id = request.query_params.get('gruppo', '')

        # ── 1. Trend mensile ─────────────────────────────────────────────────
        trend = []
        for mese in range(1, 13):
            _, giorni = calendar.monthrange(anno, mese)
            qs = Presenza.objects.filter(data__year=anno, data__month=mese)
            if gruppo_id:
                qs = qs.filter(bambino__gruppo_id=gruppo_id)
            totale = qs.count()
            presenti = qs.filter(presente=True).count()
            assenti = qs.filter(presente=False).count()
            # Media ritardo (solo record con ritardo > 0)
            avg_ritardo_arr = qs.filter(
                presente=True, minuti_ritardo_arrivo__gt=0
            ).aggregate(avg=Avg('minuti_ritardo_arrivo'))['avg'] or 0
            avg_ritardo_usc = qs.filter(
                presente=True, minuti_ritardo_uscita__gt=0
            ).aggregate(avg=Avg('minuti_ritardo_uscita'))['avg'] or 0
            trend.append({
                'mese': mese,
                'giorni_scolastici': giorni,
                'registrazioni': totale,
                'presenti': presenti,
                'assenti': assenti,
                'perc_presenza': round(presenti / totale * 100) if totale else 0,
                'avg_ritardo_arrivo': round(avg_ritardo_arr, 1),
                'avg_ritardo_uscita': round(avg_ritardo_usc, 1),
            })

        # ── 2. Riepilogo per gruppo (anno intero) ────────────────────────────
        from apps.config.models import Gruppo
        gruppi = Gruppo.objects.filter(attivo=True).order_by('ordine')
        riepilogo_gruppi = []
        for g in gruppi:
            qs = Presenza.objects.filter(
                data__year=anno, bambino__gruppo=g
            )
            totale = qs.count()
            presenti = qs.filter(presente=True).count()
            assenti = qs.filter(presente=False).count()
            riepilogo_gruppi.append({
                'gruppo_id': g.id,
                'gruppo_nome': g.nome,
                'gruppo_colore': g.colore,
                'presenti': presenti,
                'assenti': assenti,
                'perc_presenza': round(presenti / totale * 100) if totale else 0,
            })

        # ── 3. Top 10 bambini per giorni assenti (anno intero) ───────────────
        from apps.children.models import Bambino
        bambini_qs = Bambino.objects.filter(attivo=True).select_related('gruppo')
        if gruppo_id:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo_id)
        presenze_anno = (
            Presenza.objects.filter(data__year=anno, presente=False)
            .values('bambino_id')
            .annotate(giorni_assenti=Count('id'))
            .order_by('-giorni_assenti')[:10]
        )
        bambini_map = {b.id: b for b in bambini_qs}
        top_assenti = []
        for item in presenze_anno:
            b = bambini_map.get(item['bambino_id'])
            if not b:
                continue
            top_assenti.append({
                'bambino_id': b.id,
                'nome': b.nome,
                'cognome': b.cognome,
                'gruppo': b.sezione,
                'giorni_assenti': item['giorni_assenti'],
            })

        return Response({
            'anno': anno,
            'trend_mensile': trend,
            'riepilogo_gruppi': riepilogo_gruppi,
            'top_assenti': top_assenti,
        })

    @action(detail=False, methods=['get'], url_path='live-oggi')
    def live_oggi(self, request):
        """
        Bacheca presenze in tempo reale per oggi.
        - Bambini raggruppati per gruppo con stato: presente/assente/non_registrato
        - Insegnanti presenti oggi
        Accessibile a tutti gli utenti staff autenticati.
        """
        if not check_permesso(request.user, 'presenze', 'leggi'):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi = date.today()

        # ── Bambini ──────────────────────────────────────────────────────────
        from apps.children.models import Bambino
        from apps.config.models import Gruppo

        bambini_qs = (
            Bambino.objects
            .filter(attivo=True)
            .select_related('gruppo', 'orario_uscita')
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )

        presenze_oggi = {
            p.bambino_id: p
            for p in Presenza.objects.filter(data=oggi).select_related('bambino')
        }

        gruppi_map: dict = {}
        totale_presenti = 0
        totale_assenti = 0
        totale_non_registrati = 0

        for b in bambini_qs:
            p = presenze_oggi.get(b.id)
            if p is None:
                stato = 'non_registrato'
                ora_arrivo = None
                ora_uscita = None
                via_qr = False
                totale_non_registrati += 1
            elif not p.presente:
                stato = 'assente'
                ora_arrivo = None
                ora_uscita = None
                via_qr = p.via_qr
                totale_assenti += 1
            elif p.ora_uscita:
                stato = 'uscito'
                ora_arrivo = p.ora_arrivo.strftime('%H:%M') if p.ora_arrivo else None
                ora_uscita = p.ora_uscita.strftime('%H:%M')
                via_qr = p.via_qr
                totale_presenti += 1
            else:
                stato = 'presente'
                ora_arrivo = p.ora_arrivo.strftime('%H:%M') if p.ora_arrivo else None
                ora_uscita = None
                via_qr = p.via_qr
                totale_presenti += 1

            gruppo_id = b.gruppo_id or 0
            gruppo_nome = b.gruppo.nome if b.gruppo else 'Senza gruppo'
            gruppo_colore = b.gruppo.colore if b.gruppo else '#888888'

            if gruppo_id not in gruppi_map:
                gruppi_map[gruppo_id] = {
                    'gruppo_id': gruppo_id,
                    'gruppo_nome': gruppo_nome,
                    'gruppo_colore': gruppo_colore,
                    'bambini': [],
                }

            gruppi_map[gruppo_id]['bambini'].append({
                'id': b.id,
                'nome': b.nome,
                'cognome': b.cognome,
                'stato': stato,
                'ora_arrivo': ora_arrivo,
                'ora_uscita': ora_uscita,
                'via_qr': via_qr,
            })

        # ── Insegnanti ────────────────────────────────────────────────────────
        insegnanti_oggi = list(
            PresenzaInsegnante.objects
            .filter(data=oggi)
            .select_related('insegnante')
            .order_by('insegnante__last_name', 'insegnante__first_name')
        )

        insegnanti_data = []
        for pi in insegnanti_oggi:
            u = pi.insegnante
            insegnanti_data.append({
                'id': u.pk,
                'nome': u.first_name,
                'cognome': u.last_name,
                'ruolo': u.role,
                'presente': pi.presente,
                'ora_entrata': pi.ora_entrata.strftime('%H:%M') if pi.ora_entrata else None,
                'ora_uscita': pi.ora_uscita.strftime('%H:%M') if pi.ora_uscita else None,
                'via_qr': pi.via_qr,
            })

        return Response({
            'data': str(oggi),
            'aggiornato_at': dt.now().strftime('%H:%M:%S'),
            'totali': {
                'presenti': totale_presenti,
                'assenti': totale_assenti,
                'non_registrati': totale_non_registrati,
                'totale': totale_presenti + totale_assenti + totale_non_registrati,
            },
            'gruppi': list(gruppi_map.values()),
            'insegnanti': insegnanti_data,
        })

    @action(detail=False, methods=['get'], url_path='storico-qr')
    def storico_qr(self, request):
        """
        Log dei check-in via QR di oggi (o per data specificata).
        Parametri opzionali: data (YYYY-MM-DD), gruppo
        """
        if not check_permesso(request.user, 'presenze', 'leggi'):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        data_str = request.query_params.get('data', str(date.today()))
        gruppo_id = request.query_params.get('gruppo')

        bambini_qs = (
            Presenza.objects
            .filter(data=data_str, via_qr=True)
            .select_related('bambino__gruppo', 'registrato_da')
            .order_by('aggiornato_at')
        )
        if gruppo_id:
            bambini_qs = bambini_qs.filter(bambino__gruppo_id=gruppo_id)

        insegnanti_qs = (
            PresenzaInsegnante.objects
            .filter(data=data_str, via_qr=True)
            .select_related('insegnante')
            .order_by('aggiornato_at')
        )

        events = []
        for p in bambini_qs:
            b = p.bambino
            if p.ora_arrivo:
                events.append({
                    'tipo': 'bambino',
                    'azione': 'arrivo',
                    'nome': f'{b.nome} {b.cognome}',
                    'gruppo': b.gruppo.nome if b.gruppo else '',
                    'ora': p.ora_arrivo.strftime('%H:%M'),
                    'timestamp': str(p.aggiornato_at),
                })
            if p.ora_uscita:
                events.append({
                    'tipo': 'bambino',
                    'azione': 'uscita',
                    'nome': f'{b.nome} {b.cognome}',
                    'gruppo': b.gruppo.nome if b.gruppo else '',
                    'ora': p.ora_uscita.strftime('%H:%M'),
                    'timestamp': str(p.aggiornato_at),
                })

        for pi in insegnanti_qs:
            u = pi.insegnante
            nome = u.get_full_name() or u.email
            if pi.ora_entrata:
                events.append({
                    'tipo': 'insegnante',
                    'azione': 'entrata',
                    'nome': nome,
                    'gruppo': '',
                    'ora': pi.ora_entrata.strftime('%H:%M'),
                    'timestamp': str(pi.aggiornato_at),
                })
            if pi.ora_uscita:
                events.append({
                    'tipo': 'insegnante',
                    'azione': 'uscita',
                    'nome': nome,
                    'gruppo': '',
                    'ora': pi.ora_uscita.strftime('%H:%M'),
                    'timestamp': str(pi.aggiornato_at),
                })

        events.sort(key=lambda e: e['ora'])

        return Response({
            'data': data_str,
            'eventi': events,
            'totale': len(events),
        })

    # ── Export PDF ───────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='export-pdf-presenze')
    def export_pdf_presenze(self, request):
        """
        Admin/Direttrice/Coordinatrice: esporta PDF report presenze mensile.
        Parametri: anno, mese, gruppo (opzionale).
        """
        from django.http import HttpResponse
        from weasyprint import HTML
        import calendar as cal_mod

        if not check_permesso(request.user, 'presenze', 'leggi'):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        role = request.user.role
        if role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE):
            return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)

        oggi = date.today()
        anno = int(request.query_params.get('anno', oggi.year))
        mese = int(request.query_params.get('mese', oggi.month))
        gruppo_id = request.query_params.get('gruppo', '')

        MESI_IT = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                   'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
        GIORNI_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

        bambini_qs = (
            Bambino.objects.filter(attivo=True)
            .select_related('gruppo')
            .order_by('gruppo__ordine', 'cognome', 'nome')
        )
        if gruppo_id:
            bambini_qs = bambini_qs.filter(gruppo_id=gruppo_id)

        _, giorni_nel_mese = cal_mod.monthrange(anno, mese)
        presenze_mese = {
            (p.bambino_id, p.data.day): p
            for p in Presenza.objects.filter(data__year=anno, data__month=mese)
        }

        # Intestazione colonne giorni
        col_giorni = ''
        for g in range(1, giorni_nel_mese + 1):
            dow = date(anno, mese, g).weekday()
            cls = ' class="weekend"' if dow >= 5 else ''
            col_giorni += f'<th{cls}>{g}<br><small>{GIORNI_IT[dow]}</small></th>'

        # Righe bambini
        righe_html = ''
        for b in bambini_qs:
            pres_count = 0
            ass_count = 0
            celle = ''
            for g in range(1, giorni_nel_mese + 1):
                p = presenze_mese.get((b.id, g))
                if p is None:
                    celle += '<td class="vuoto">—</td>'
                elif p.presente:
                    pres_count += 1
                    celle += '<td class="presente">P</td>'
                else:
                    ass_count += 1
                    motivo = (p.motivo_assenza or '').upper()[:1] or 'A'
                    celle += f'<td class="assente" title="{p.motivo_assenza or ""}">{motivo}</td>'
            perc = round(pres_count / giorni_nel_mese * 100)
            righe_html += f'''
            <tr>
              <td class="nome">{b.cognome} {b.nome}</td>
              <td class="sezione">{b.sezione}</td>
              {celle}
              <td class="totale-p">{pres_count}</td>
              <td class="totale-a">{ass_count}</td>
              <td class="perc">{perc}%</td>
            </tr>'''

        titolo_gruppo = ''
        if gruppo_id:
            try:
                from apps.config.models import Gruppo
                titolo_gruppo = f' — {Gruppo.objects.get(id=gruppo_id).nome}'
            except Exception:
                pass

        from django.utils import timezone as tz
        data_stampa = tz.now().strftime('%d/%m/%Y %H:%M')

        html = f'''<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<style>
  @page {{ size: A3 landscape; margin: 1.5cm; }}
  body {{ font-family: Arial, sans-serif; font-size: 8pt; color: #222; }}
  h1 {{ font-size: 14pt; color: #27AE60; margin-bottom: 0.2cm; }}
  .meta {{ font-size: 8pt; color: #888; margin-bottom: 0.5cm; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th {{ background: #D5F5E3; padding: 4px 3px; border: 1px solid #9AE6B4; font-size: 7.5pt; text-align: center; white-space: nowrap; }}
  td {{ padding: 3px 4px; border: 1px solid #DDD; text-align: center; font-size: 7.5pt; }}
  td.nome {{ text-align: left; font-weight: bold; min-width: 4cm; white-space: nowrap; }}
  td.sezione {{ font-size: 7pt; color: #888; }}
  td.presente {{ background: #D5F5E3; color: #1E8449; font-weight: bold; }}
  td.assente {{ background: #FADBD8; color: #922B21; font-weight: bold; }}
  td.vuoto {{ color: #CCC; }}
  th.weekend, td.weekend {{ background: #F7F7F7; color: #AAA; }}
  td.totale-p {{ background: #EBF9F1; font-weight: bold; color: #27AE60; }}
  td.totale-a {{ background: #FEF3F2; font-weight: bold; color: #E74C3C; }}
  td.perc {{ font-weight: bold; }}
  .footer {{ margin-top: 0.5cm; font-size: 7pt; color: #aaa; border-top: 1px solid #EEE; padding-top: 0.2cm; }}
</style>
</head>
<body>
<h1>✅ Report Presenze — {MESI_IT[mese]} {anno}{titolo_gruppo}</h1>
<div class="meta">Stampa: {data_stampa} &nbsp;|&nbsp; P = Presente &nbsp;|&nbsp; A/M/F = Assente/Malattia/Ferie &nbsp;|&nbsp; — = non registrato</div>
<table>
  <thead>
    <tr>
      <th style="text-align:left">Bambino</th>
      <th>Sezione</th>
      {col_giorni}
      <th style="background:#D5F5E3">P</th>
      <th style="background:#FADBD8">A</th>
      <th>%</th>
    </tr>
  </thead>
  <tbody>
    {righe_html}
  </tbody>
</table>
<div class="footer">Generato da Sherazade — dati riservati, uso interno</div>
</body>
</html>'''

        pdf_bytes = HTML(string=html).write_pdf()
        nome_file = f'presenze_{anno}_{mese:02d}.pdf'
        if gruppo_id:
            nome_file = f'presenze_{anno}_{mese:02d}_g{gruppo_id}.pdf'
        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{nome_file}"'
        return resp

