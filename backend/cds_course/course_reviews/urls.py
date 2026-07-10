from core.routing import crud_urlpatterns
from .views import CourseReviewDetailView, CourseReviewListCreateView
urlpatterns = crud_urlpatterns(CourseReviewListCreateView, CourseReviewDetailView, "course-reviews")
