from core.api import ModelDetailView, ModelListCreateView
from .models import CourseModule
from .serializers import CourseModuleSerializer

class CourseModuleListCreateView(ModelListCreateView):
    queryset = CourseModule.objects.all()
    serializer_class = CourseModuleSerializer

class CourseModuleDetailView(ModelDetailView):
    queryset = CourseModule.objects.all()
    serializer_class = CourseModuleSerializer
