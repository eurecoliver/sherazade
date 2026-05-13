import secrets
import threading

from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status, viewsets, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User, Role, PasswordResetToken
from .serializers import UserSerializer, UserAdminSerializer


class UtentePermission(permissions.BasePermission):
    """Accesso a gestione utenti: controllato da PermessoRuolo('utenti')."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        from apps.config.permessi import check_permesso
        from rest_framework.permissions import SAFE_METHODS
        if request.method == 'DELETE':
            return check_permesso(request.user, 'utenti', 'elimina')
        if request.method in SAFE_METHODS:
            return check_permesso(request.user, 'utenti', 'leggi')
        return check_permesso(request.user, 'utenti', 'scrivi')

    def has_object_permission(self, request, view, obj):
        from rest_framework.permissions import SAFE_METHODS
        # Solo admin può modificare/eliminare altri utenti admin
        if obj.role == 'admin' and request.user.role != 'admin':
            return request.method in SAFE_METHODS
        return True


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    @method_decorator(ratelimit(key='ip', rate='5/5m', method='POST', block=False))
    def post(self, request):
        if getattr(request, 'limited', False):
            return Response(
                {'detail': 'Troppi tentativi di accesso. Riprova tra 5 minuti.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response(
                {'detail': 'Email e password sono obbligatori.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Credenziali non valide.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(request, username=user_obj.username, password=password)
        if user is None or not user.is_active:
            return Response(
                {'detail': 'Credenziali non valide.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Se 2FA attivo → restituisce totp_session invece dei JWT
        if user.two_factor_enabled:
            from django.core import signing
            totp_session = signing.dumps({'uid': user.id}, salt='2fa-login')
            return Response({'totp_required': True, 'totp_session': totp_session})

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': user.role,
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token richiesto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'detail': 'Token non valido o già revocato.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserAdminViewSet(viewsets.ModelViewSet):
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAuthenticated, UtentePermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['last_name', 'first_name', 'role', 'email']
    ordering = ['last_name', 'first_name']

    def get_queryset(self):
        qs = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        attivo = self.request.query_params.get('attivo')
        if attivo is not None:
            qs = qs.filter(is_active=attivo.lower() == 'true')
        return qs

    def _check_admin_role(self, role_value):
        """Blocca assegnazione ruolo admin a chiunque non sia admin."""
        if role_value == 'admin' and self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Solo un admin può creare o assegnare il ruolo admin.')

    def perform_create(self, serializer):
        self._check_admin_role(serializer.validated_data.get('role', ''))
        serializer.save()

    def perform_update(self, serializer):
        self._check_admin_role(serializer.validated_data.get('role', self.get_object().role))
        serializer.save()


# ─── Password reset ────────────────────────────────────────────────────────────

def _send_reset_email(email, reset_url):
    try:
        send_mail(
            subject='Sherazade — Reset password',
            message=(
                f'Ciao,\n\n'
                f'Hai richiesto il reset della password per il tuo account Sherazade.\n\n'
                f'Clicca sul link seguente per impostare una nuova password:\n{reset_url}\n\n'
                f'Il link scade tra 1 ora.\n\n'
                f'Se non hai fatto questa richiesta, ignora questa email.\n\n'
                f'— Team Sherazade'
            ),
            from_email=None,  # usa DEFAULT_FROM_EMAIL
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception:
        pass  # errori email non devono bloccare la risposta HTTP


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password-reset/ — invia email con link di reset."""
    permission_classes = [permissions.AllowAny]

    @method_decorator(ratelimit(key='ip', rate='5/10m', method='POST', block=False))
    def post(self, request):
        if getattr(request, 'limited', False):
            return Response(
                {'detail': 'Troppi tentativi. Riprova tra 10 minuti.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response(
                {'detail': 'Email obbligatoria.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Risposta sempre 200 per non rivelare se l'email esiste
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'detail': 'Se l\'email esiste riceverai un link di reset.'})

        if not user.is_active:
            return Response({'detail': 'Se l\'email esiste riceverai un link di reset.'})

        # Invalida token precedenti per questo utente
        PasswordResetToken.objects.filter(user=user, usato=False).update(usato=True)

        token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.create(user=user, token=token)

        frontend_url = request.data.get('frontend_url', '').rstrip('/')
        reset_url = f'{frontend_url}/it/reset-password/confirm?token={token}'

        threading.Thread(
            target=_send_reset_email,
            args=(user.email, reset_url),
            daemon=True,
        ).start()

        return Response({'detail': 'Se l\'email esiste riceverai un link di reset.'})


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password-reset/confirm/ — imposta nuova password via token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')

        if not token_str or not new_password:
            return Response(
                {'detail': 'Token e nuova password sono obbligatori.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {'detail': 'La password deve essere di almeno 8 caratteri.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cutoff = timezone.now() - timezone.timedelta(hours=1)
        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(
                token=token_str,
                usato=False,
                creato_at__gte=cutoff,
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'detail': 'Token non valido o scaduto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_token.user
        user.set_password(new_password)
        user.save(update_fields=['password'])

        reset_token.usato = True
        reset_token.save(update_fields=['usato'])

        return Response({'detail': 'Password aggiornata con successo.'})


class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password/ — cambia password dell'utente autenticato."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not current_password or not new_password:
            return Response(
                {'detail': 'Password attuale e nuova password sono obbligatorie.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {'detail': 'La nuova password deve essere di almeno 8 caratteri.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=request.user.username, password=current_password)
        if user is None:
            return Response(
                {'detail': 'Password attuale non corretta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response({'detail': 'Password aggiornata con successo.'})


# ─── 2FA TOTP ──────────────────────────────────────────────────────────────────

class TwoFactorSetupView(APIView):
    """
    GET  → genera secret + URI provisioning per il QR code (non attiva ancora il 2FA)
    POST → verifica il codice TOTP e attiva il 2FA
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import pyotp
        from django.core import signing

        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=request.user.email,
            issuer_name='Sherazade',
        )
        # Firma il secret con scadenza 10 minuti — non serve salvarlo nel DB
        setup_token = signing.dumps(
            {'uid': request.user.id, 'secret': secret},
            salt='2fa-setup',
        )
        return Response({
            'secret': secret,
            'qr_uri': provisioning_uri,
            'setup_token': setup_token,
        })

    def post(self, request):
        import pyotp
        from django.core import signing

        setup_token = request.data.get('setup_token', '')
        code = request.data.get('code', '').strip()

        if not setup_token or not code:
            return Response(
                {'detail': 'setup_token e code sono obbligatori.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data = signing.loads(setup_token, salt='2fa-setup', max_age=600)
        except signing.BadSignature:
            return Response(
                {'detail': 'Token non valido o scaduto. Ricarica la pagina.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if data['uid'] != request.user.id:
            return Response({'detail': 'Token non valido.'}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(data['secret'])
        if not totp.verify(code, valid_window=1):
            return Response(
                {'detail': 'Codice non valido. Controlla l\'ora del tuo dispositivo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.two_factor_secret = data['secret']
        request.user.two_factor_enabled = True
        request.user.save(update_fields=['two_factor_secret', 'two_factor_enabled'])

        return Response({'detail': '2FA attivato con successo.'})


class TwoFactorDisableView(APIView):
    """POST → disabilita il 2FA richiedendo la password attuale."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password', '')
        if not password:
            return Response(
                {'detail': 'Password obbligatoria.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=request.user.username, password=password)
        if user is None:
            return Response(
                {'detail': 'Password non corretta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.two_factor_enabled = False
        user.two_factor_secret = ''
        user.save(update_fields=['two_factor_enabled', 'two_factor_secret'])

        return Response({'detail': '2FA disabilitato.'})


class TwoFactorVerifyLoginView(APIView):
    """
    POST → step 2 del login: verifica il codice TOTP e restituisce i JWT.
    Riceve { totp_session: "<signed>", code: "XXXXXX" }.
    """
    permission_classes = [permissions.AllowAny]

    @method_decorator(ratelimit(key='ip', rate='10/5m', method='POST', block=False))
    def post(self, request):
        if getattr(request, 'limited', False):
            return Response(
                {'detail': 'Troppi tentativi. Riprova tra 5 minuti.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        import pyotp
        from django.core import signing

        totp_session = request.data.get('totp_session', '')
        code = request.data.get('code', '').strip()

        if not totp_session or not code:
            return Response(
                {'detail': 'totp_session e code sono obbligatori.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data = signing.loads(totp_session, salt='2fa-login', max_age=300)
        except signing.BadSignature:
            return Response(
                {'detail': 'Sessione scaduta. Esegui di nuovo il login.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.get(pk=data['uid'])
        except User.DoesNotExist:
            return Response({'detail': 'Utente non trovato.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active:
            return Response({'detail': 'Account disabilitato.'}, status=status.HTTP_401_UNAUTHORIZED)

        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(code, valid_window=1):
            return Response(
                {'detail': 'Codice non valido. Controlla l\'ora del tuo dispositivo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': user.role,
            'user': UserSerializer(user).data,
        })
