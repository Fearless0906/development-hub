from core.api import ModelDetailView, ModelListCreateView
from .models import Question
from .serializers import QuestionSerializer

class QuestionListCreateView(ModelListCreateView):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer

class QuestionDetailView(ModelDetailView):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
