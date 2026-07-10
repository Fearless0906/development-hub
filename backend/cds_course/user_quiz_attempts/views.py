from core.api import ModelDetailView, ModelListCreateView
from .models import UserQuizAttempt
from .serializers import UserQuizAttemptSerializer

class UserQuizAttemptListCreateView(ModelListCreateView):
    queryset = UserQuizAttempt.objects.all()
    serializer_class = UserQuizAttemptSerializer

class UserQuizAttemptDetailView(ModelDetailView):
    queryset = UserQuizAttempt.objects.all()
    serializer_class = UserQuizAttemptSerializer
