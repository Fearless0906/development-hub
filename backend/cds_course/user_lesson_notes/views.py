from core.api import ModelDetailView, ModelListCreateView
from .models import UserLessonNote
from .serializers import UserLessonNoteSerializer

class UserLessonNoteListCreateView(ModelListCreateView):
    queryset = UserLessonNote.objects.all()
    serializer_class = UserLessonNoteSerializer

class UserLessonNoteDetailView(ModelDetailView):
    queryset = UserLessonNote.objects.all()
    serializer_class = UserLessonNoteSerializer
