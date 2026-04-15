from rest_framework.routers import DefaultRouter
from .views import LogAccessoViewSet

router = DefaultRouter()
router.register('audit/log', LogAccessoViewSet, basename='log-accesso')

urlpatterns = router.urls
