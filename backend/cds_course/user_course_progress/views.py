from core.api import ModelDetailView, ModelListCreateView
from .models import UserCourseProgress
from .serializers import UserCourseProgressSerializer

class UserCourseProgressListCreateView(ModelListCreateView):
    queryset = UserCourseProgress.objects.all()
    serializer_class = UserCourseProgressSerializer

class UserCourseProgressDetailView(ModelDetailView):
    queryset = UserCourseProgress.objects.all()
    serializer_class = UserCourseProgressSerializer
