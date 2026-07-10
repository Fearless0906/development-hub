from rest_framework import generics
from .models import CodeSnippet
from .serializers import CodeSnippetSerializer


class CodeSnippetListCreateView(generics.ListCreateAPIView):
    queryset = CodeSnippet.objects.all()
    serializer_class = CodeSnippetSerializer

class CodeSnippetDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CodeSnippet.objects.all()
    serializer_class = CodeSnippetSerializer
