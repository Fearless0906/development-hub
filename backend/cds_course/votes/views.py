from core.api import ModelDetailView, ModelListCreateView
from .models import Vote
from .serializers import VoteSerializer

class VoteListCreateView(ModelListCreateView):
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer

class VoteDetailView(ModelDetailView):
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer
