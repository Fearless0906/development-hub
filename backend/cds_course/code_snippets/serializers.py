from rest_framework import serializers
from .models import CodeSnippet
from users.serializers import UserSerializer
from tags.serializers import TagSerializer


class ForkedFromSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeSnippet
        fields = (
            "id",
            "title",
            "language",
            "created_at",
        )

class CodeSnippetSerializer(serializers.ModelSerializer):
    profiles = UserSerializer(source="user", read_only=True)
    snippet_tags = TagSerializer(source="tags", many=True, read_only=True)
    fork = ForkedFromSerializer(source="forked_from", read_only=True)

    class Meta:
        model = CodeSnippet
        fields = (
            "id",
            "user",
            "profiles",
            "title",
            "description",
            "code",
            "language",
            "is_public",
            "views_count",
            "votes_count",
            "forks_count",
            "forked_from",  # UUID for POST/PATCH
            "fork",         # Nested object for GET
            "created_at",
            "updated_at",
            "snippet_tags",
        )
        read_only_fields = ("user",)