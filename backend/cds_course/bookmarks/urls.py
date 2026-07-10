from core.routing import crud_urlpatterns
from .views import BookmarkDetailView, BookmarkListCreateView
urlpatterns = crud_urlpatterns(BookmarkListCreateView, BookmarkDetailView, "bookmarks")
