from django.urls import path
from .views import CodeSnippetListCreateView, CodeSnippetDetailView

urlpatterns = [
    path('', CodeSnippetListCreateView.as_view(), name="code-snippet-list-create"),
    path('<int:pk>/', CodeSnippetDetailView.as_view(), name="code-snippet-detail")
]
