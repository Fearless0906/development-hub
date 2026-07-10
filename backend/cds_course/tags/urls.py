from core.routing import crud_urlpatterns
from .views import TagDetailView, TagListCreateView
urlpatterns = crud_urlpatterns(TagListCreateView, TagDetailView, "tags")
