from rest_framework.routers import DefaultRouter
from .views import AnnoScolasticoViewSet, IscrizioneViewSet, MediaPortfolioViewSet

router = DefaultRouter()
router.register(r'portfolio/anni', AnnoScolasticoViewSet, basename='anno-scolastico')
router.register(r'portfolio/iscrizioni', IscrizioneViewSet, basename='iscrizione')
router.register(r'portfolio/media', MediaPortfolioViewSet, basename='media-portfolio')

urlpatterns = router.urls
