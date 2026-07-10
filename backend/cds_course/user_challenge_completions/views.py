from core.api import ModelDetailView, ModelListCreateView
from .models import UserChallengeCompletion
from .serializers import UserChallengeCompletionSerializer

class UserChallengeCompletionListCreateView(ModelListCreateView):
    queryset = UserChallengeCompletion.objects.all()
    serializer_class = UserChallengeCompletionSerializer

class UserChallengeCompletionDetailView(ModelDetailView):
    queryset = UserChallengeCompletion.objects.all()
    serializer_class = UserChallengeCompletionSerializer
