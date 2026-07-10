from djoser.serializers import UserCreateSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class CreateUserSerializer(UserCreateSerializer):
    class Meta(UserCreateSerializer.Meta):
        model = User
        fields = (
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "bio",
            "first_name",
            "last_name",
            "avatar_url",
            "website",
            "github_username",
            "reputation",
            "questions_count",
            "answers_count",
            "updated_at",
            "is_staff",
            "is_active",
            "date_joined",
        )
        read_only_fields = (
            "id",
            "reputation",
            "questions_count",
            "answers_count",
            "updated_at",
            "is_staff",
            "is_active",
            "date_joined",
        )