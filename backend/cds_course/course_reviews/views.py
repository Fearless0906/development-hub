from core.api import ModelDetailView, ModelListCreateView
from .models import CourseReview
from .serializers import CourseReviewSerializer

class CourseReviewListCreateView(ModelListCreateView):
    queryset = CourseReview.objects.all()
    serializer_class = CourseReviewSerializer

class CourseReviewDetailView(ModelDetailView):
    queryset = CourseReview.objects.all()
    serializer_class = CourseReviewSerializer
