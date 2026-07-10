from core.routing import crud_urlpatterns
from .views import SnippetTagDetailView, SnippetTagListCreateView
urlpatterns = crud_urlpatterns(SnippetTagListCreateView, SnippetTagDetailView, "snippet-tags")
