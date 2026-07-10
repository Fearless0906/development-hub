from rest_framework import serializers
from .models import UserLessonNote

class UserLessonNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLessonNote
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in UserLessonNote._meta.fields) else []
