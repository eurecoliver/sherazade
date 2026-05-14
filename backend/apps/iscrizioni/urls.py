from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ConfigurazioneIscrizioniViewSet, RichiestaIscrizioneViewSet

router = DefaultRouter()
router.register(r'iscrizioni/richieste', RichiestaIscrizioneViewSet, basename='richiesta-iscrizione')

urlpatterns = router.urls + [
    path('iscrizioni/config/', ConfigurazioneIscrizioniViewSet.as_view({
        'get': 'list',
        'patch': 'partial_update',
    })),
]
