from core.routing import crud_urlpatterns
from .views import LessonDetailView, LessonListCreateView
urlpatterns = crud_urlpatterns(LessonListCreateView, LessonDetailView, "lessons")
