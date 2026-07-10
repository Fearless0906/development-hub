from core.routing import crud_urlpatterns
from .views import QuestionTagDetailView, QuestionTagListCreateView
urlpatterns = crud_urlpatterns(QuestionTagListCreateView, QuestionTagDetailView, "question-tags")
