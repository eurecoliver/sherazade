from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import (
    LoginView, LogoutView, MeView, ProfileView, UserAdminViewSet,
    PasswordResetRequestView, PasswordResetConfirmView, ChangePasswordView,
    TwoFactorSetupView, TwoFactorDisableView, TwoFactorVerifyLoginView,
)

router = DefaultRouter()
router.register('utenti', UserAdminViewSet, basename='utente')

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('2fa/setup/', TwoFactorSetupView.as_view(), name='2fa_setup'),
    path('2fa/verify/', TwoFactorVerifyLoginView.as_view(), name='2fa_verify'),
    path('2fa/disable/', TwoFactorDisableView.as_view(), name='2fa_disable'),
    # Legacy
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    # Admin user management
    path('', include(router.urls)),
]
