from core.routing import crud_urlpatterns
from .views import UserLessonNoteDetailView, UserLessonNoteListCreateView
urlpatterns = crud_urlpatterns(UserLessonNoteListCreateView, UserLessonNoteDetailView, "user-lesson-notes")
