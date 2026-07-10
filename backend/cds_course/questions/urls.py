from core.routing import crud_urlpatterns
from .views import QuestionDetailView, QuestionListCreateView
urlpatterns = crud_urlpatterns(QuestionListCreateView, QuestionDetailView, "questions")
