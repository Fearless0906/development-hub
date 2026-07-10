from core.api import ModelDetailView, ModelListCreateView
from .models import Tag
from .serializers import TagSerializer

class TagListCreateView(ModelListCreateView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

class TagDetailView(ModelDetailView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
