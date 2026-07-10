from rest_framework import serializers
from .models import UserRole

class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in UserRole._meta.fields) else []
