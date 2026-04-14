from django.contrib.auth import authenticate
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, permissions, status, viewsets, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User, Role
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
