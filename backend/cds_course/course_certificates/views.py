from core.api import ModelDetailView, ModelListCreateView
from .models import CourseCertificate
from .serializers import CourseCertificateSerializer

class CourseCertificateListCreateView(ModelListCreateView):
    queryset = CourseCertificate.objects.all()
    serializer_class = CourseCertificateSerializer

class CourseCertificateDetailView(ModelDetailView):
    queryset = CourseCertificate.objects.all()
    serializer_class = CourseCertificateSerializer
