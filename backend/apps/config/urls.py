from rest_framework.routers import DefaultRouter

from .views import GruppoViewSet, OrarioUscitaViewSet, PermessoRuoloViewSet, RuoloViewSet

router = DefaultRouter()
router.register('config/gruppi', GruppoViewSet, basename='gruppo')
router.register('config/orari', OrarioUscitaViewSet, basename='orario-uscita')
router.register('config/ruoli', RuoloViewSet, basename='ruolo')
router.register('config/permessi', PermessoRuoloViewSet, basename='permesso-ruolo')

urlpatterns = router.urls
