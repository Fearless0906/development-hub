from core.routing import crud_urlpatterns
from .views import NotificationDetailView, NotificationListCreateView
urlpatterns = crud_urlpatterns(NotificationListCreateView, NotificationDetailView, "notifications")
