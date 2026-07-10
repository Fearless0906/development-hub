from django.urls import path

def crud_urlpatterns(list_view, detail_view, basename):
    return [
        path("", list_view.as_view(), name=f"{basename}-list"),
        path("<uuid:pk>/", detail_view.as_view(), name=f"{basename}-detail"),
    ]
