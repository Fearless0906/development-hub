from core.api import ModelDetailView, ModelListCreateView
from .models import QuestionTag
from .serializers import QuestionTagSerializer

class QuestionTagListCreateView(ModelListCreateView):
    queryset = QuestionTag.objects.all()
    serializer_class = QuestionTagSerializer

class QuestionTagDetailView(ModelDetailView):
    queryset = QuestionTag.objects.all()
    serializer_class = QuestionTagSerializer
