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
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Derive live totals for accounts created before activity signals were
        # introduced; new activity also persists these values automatically.
        from .signals import get_user_achievement_totals

        data.update(get_user_achievement_totals(instance.id))
        return data

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
            "is_superuser",
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
            "is_superuser",
            "is_active",
            "date_joined",
        )
