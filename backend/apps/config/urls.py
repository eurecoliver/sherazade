from rest_framework.routers import DefaultRouter

from .views import GruppoViewSet, OrarioUscitaViewSet

router = DefaultRouter()
router.register('config/gruppi', GruppoViewSet, basename='gruppo')
router.register('config/orari', OrarioUscitaViewSet, basename='orario-uscita')

urlpatterns = router.urls
