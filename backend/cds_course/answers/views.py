from core.api import ModelDetailView, ModelListCreateView
from .models import Answer
from .serializers import AnswerSerializer

class AnswerListCreateView(ModelListCreateView):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer

class AnswerDetailView(ModelDetailView):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
