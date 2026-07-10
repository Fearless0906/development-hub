from rest_framework import serializers
from .models import UserQuizAttempt

class UserQuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserQuizAttempt
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in UserQuizAttempt._meta.fields) else []
