from rest_framework import serializers
from .models import UserChallengeCompletion

class UserChallengeCompletionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserChallengeCompletion
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in UserChallengeCompletion._meta.fields) else []
