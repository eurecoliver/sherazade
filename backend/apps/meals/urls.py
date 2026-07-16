from rest_framework.routers import DefaultRouter
from .views import (
    AllergiaIntolleranzaViewSet,
    MenuGiornalieroViewSet,
    RegistroPastoViewSet,
    ConfigMenuCicloViewSet,
    PiattoViewSet,
    PiattoAssegnazioneViewSet,
    SostituzionePiattoViewSet,
    PreferenzaMenuBambinoViewSet,
)

router = DefaultRouter()
router.register(r'meals/allergie', AllergiaIntolleranzaViewSet, basename='allergia')
router.register(r'meals/menu', MenuGiornalieroViewSet, basename='menu')
router.register(r'meals/pasti', RegistroPastoViewSet, basename='pasto')
router.register(r'pappe/config', ConfigMenuCicloViewSet, basename='pappe-config')
router.register(r'pappe/piatti', PiattoViewSet, basename='piatto')
router.register(r'pappe/assegnazioni', PiattoAssegnazioneViewSet, basename='assegnazione')
router.register(r'pappe/sostituzioni', SostituzionePiattoViewSet, basename='sostituzione')
router.register(r'pappe/preferenze-menu', PreferenzaMenuBambinoViewSet, basename='preferenza-menu')

urlpatterns = router.urls
