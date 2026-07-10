from rest_framework import serializers
from .models import CourseModule

class CourseModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseModule
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in CourseModule._meta.fields) else []
