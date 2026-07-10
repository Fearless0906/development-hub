from core.routing import crud_urlpatterns
from .views import AnswerDetailView, AnswerListCreateView
urlpatterns = crud_urlpatterns(AnswerListCreateView, AnswerDetailView, "answers")
