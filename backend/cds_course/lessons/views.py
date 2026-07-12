from core.api import ModelDetailView, ModelListCreateView
from .models import Lesson
from .serializers import LessonSerializer

class LessonListCreateView(ModelListCreateView):
    queryset = Lesson.objects.select_related("module", "module__course")
    serializer_class = LessonSerializer

class LessonDetailView(ModelDetailView):
    queryset = Lesson.objects.select_related("module", "module__course")
    serializer_class = LessonSerializer
