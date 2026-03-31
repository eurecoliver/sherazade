from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import LoginView, LogoutView, MeView, ProfileView, UserAdminViewSet

router = DefaultRouter()
router.register('utenti', UserAdminViewSet, basename='utente')

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('profile/', ProfileView.as_view(), name='profile'),
    # Legacy
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    # Admin user management
    path('', include(router.urls)),
]
