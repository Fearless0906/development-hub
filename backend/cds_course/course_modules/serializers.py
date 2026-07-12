from rest_framework import serializers

from lessons.serializers import LessonSerializer
from .models import CourseModule


class CourseModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = CourseModule
        fields = "__all__"
