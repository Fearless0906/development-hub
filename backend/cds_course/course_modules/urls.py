from core.routing import crud_urlpatterns
from .views import CourseModuleDetailView, CourseModuleListCreateView
urlpatterns = crud_urlpatterns(CourseModuleListCreateView, CourseModuleDetailView, "course-modules")
