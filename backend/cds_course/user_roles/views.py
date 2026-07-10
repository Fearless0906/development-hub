from core.api import ModelDetailView, ModelListCreateView
from .models import UserRole
from .serializers import UserRoleSerializer

class UserRoleListCreateView(ModelListCreateView):
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer

class UserRoleDetailView(ModelDetailView):
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
