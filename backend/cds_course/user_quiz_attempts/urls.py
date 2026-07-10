from core.routing import crud_urlpatterns
from .views import UserQuizAttemptDetailView, UserQuizAttemptListCreateView
urlpatterns = crud_urlpatterns(UserQuizAttemptListCreateView, UserQuizAttemptDetailView, "user-quiz-attempts")
