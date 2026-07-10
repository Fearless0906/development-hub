from core.api import ModelDetailView, ModelListCreateView
from .models import Bookmark
from .serializers import BookmarkSerializer

class BookmarkListCreateView(ModelListCreateView):
    queryset = Bookmark.objects.all()
    serializer_class = BookmarkSerializer

class BookmarkDetailView(ModelDetailView):
    queryset = Bookmark.objects.all()
    serializer_class = BookmarkSerializer
