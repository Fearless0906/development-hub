from rest_framework import generics

class ModelListCreateView(generics.ListCreateAPIView):
    def perform_create(self, serializer):
        if any(field.name == "user" for field in serializer.Meta.model._meta.fields):
            serializer.save(user=self.request.user)
        else:
            serializer.save()

class ModelDetailView(generics.RetrieveUpdateDestroyAPIView):
    pass
