from rest_framework import serializers
from .models import CourseReview

class CourseReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseReview
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in CourseReview._meta.fields) else []
