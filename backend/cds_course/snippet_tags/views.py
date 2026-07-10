from core.api import ModelDetailView, ModelListCreateView
from .models import SnippetTag
from .serializers import SnippetTagSerializer

class SnippetTagListCreateView(ModelListCreateView):
    queryset = SnippetTag.objects.all()
    serializer_class = SnippetTagSerializer

class SnippetTagDetailView(ModelDetailView):
    queryset = SnippetTag.objects.all()
    serializer_class = SnippetTagSerializer
