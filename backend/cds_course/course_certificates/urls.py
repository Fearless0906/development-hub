from core.routing import crud_urlpatterns
from .views import CourseCertificateDetailView, CourseCertificateListCreateView
urlpatterns = crud_urlpatterns(CourseCertificateListCreateView, CourseCertificateDetailView, "course-certificates")
