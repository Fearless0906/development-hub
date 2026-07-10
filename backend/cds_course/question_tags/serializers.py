from rest_framework import serializers
from .models import QuestionTag

class QuestionTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionTag
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in QuestionTag._meta.fields) else []
