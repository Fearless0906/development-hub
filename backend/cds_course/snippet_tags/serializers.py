from rest_framework import serializers
from .models import SnippetTag

class SnippetTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = SnippetTag
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in SnippetTag._meta.fields) else []
