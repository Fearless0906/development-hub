from core.api import ModelDetailView, ModelListCreateView
from .models import Lesson
from .serializers import LessonSerializer

class LessonListCreateView(ModelListCreateView):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer

class LessonDetailView(ModelDetailView):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
