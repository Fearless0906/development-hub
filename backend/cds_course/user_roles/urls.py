from core.routing import crud_urlpatterns
from .views import UserRoleDetailView, UserRoleListCreateView
urlpatterns = crud_urlpatterns(UserRoleListCreateView, UserRoleDetailView, "user-roles")
