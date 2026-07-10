from rest_framework import serializers
from .models import UserCourseProgress

class UserCourseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCourseProgress
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in UserCourseProgress._meta.fields) else []
