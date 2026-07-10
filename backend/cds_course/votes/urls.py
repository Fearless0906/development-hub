from core.routing import crud_urlpatterns
from .views import VoteDetailView, VoteListCreateView
urlpatterns = crud_urlpatterns(VoteListCreateView, VoteDetailView, "votes")
