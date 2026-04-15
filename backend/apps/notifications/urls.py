from rest_framework.routers import DefaultRouter
from .views import NotificheViewSet

router = DefaultRouter()
router.register('notifiche', NotificheViewSet, basename='notifiche')

urlpatterns = router.urls
