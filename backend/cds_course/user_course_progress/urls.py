from core.routing import crud_urlpatterns
from .views import UserCourseProgressDetailView, UserCourseProgressListCreateView
urlpatterns = crud_urlpatterns(UserCourseProgressListCreateView, UserCourseProgressDetailView, "user-course-progress")
