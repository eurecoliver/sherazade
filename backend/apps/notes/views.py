from datetime import date

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import NotaGiornata
from .permissions import NotaPermission, MANAGER_ROLES
from .serializers import NotaGiornataSerializer


class NotaGiornataViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, NotaPermission]
    serializer_class = NotaGiornataSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = NotaGiornata.objects.filter(attivo=True).select_related(
            'autore', 'gruppo'
        )
        # Filtro per data
        data_param = self.request.query_params.get('data')
        if data_param:
            try:
                qs = qs.filter(data=data_param)
            except ValueError:
                pass
        else:
            qs = qs.filter(data=date.today())

        # Filtro per gruppo (0 = tutte le note generali)
        gruppo_param = self.request.query_params.get('gruppo')
        if gruppo_param is not None:
            if gruppo_param == '0':
                qs = qs.filter(gruppo__isnull=True)
            else:
                try:
                    qs = qs.filter(gruppo_id=int(gruppo_param))
                except ValueError:
                    pass

        return qs

    def destroy(self, request, *args, **kwargs):
        nota = self.get_object()
        # Soft-delete
        nota.attivo = False
        nota.save(update_fields=['attivo', 'aggiornato_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)
