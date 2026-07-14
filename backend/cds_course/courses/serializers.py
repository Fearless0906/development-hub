from rest_framework import serializers
from .models import Course, DemoRequest

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = ["created_by"]


class DemoRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoRequest
        fields = "__all__"
        read_only_fields = ["id", "created_at"]
