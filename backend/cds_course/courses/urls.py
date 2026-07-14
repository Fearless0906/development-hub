from django.urls import path
from .views import CourseDetailView, CourseListCreateView, DemoRequestCreateView

urlpatterns = [
    path('', CourseListCreateView.as_view(), name="course-list-create"),
    path('demo-requests/', DemoRequestCreateView.as_view(), name="demo-request-create"),
    path('<uuid:pk>/', CourseDetailView.as_view(), name="course-detail"),
]
