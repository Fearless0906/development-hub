from rest_framework import serializers
from .models import CourseCertificate

class CourseCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseCertificate
        fields = "__all__"
        read_only_fields = ["user"] if any(f.name == "user" for f in CourseCertificate._meta.fields) else []
