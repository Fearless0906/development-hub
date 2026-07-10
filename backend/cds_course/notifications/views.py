from core.api import ModelDetailView, ModelListCreateView
from .models import Notification
from .serializers import NotificationSerializer

class NotificationListCreateView(ModelListCreateView):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

class NotificationDetailView(ModelDetailView):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
