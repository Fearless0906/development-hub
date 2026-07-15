from django.urls import path, include, re_path

from .views import CsrfTokenView, NetworkProviderAuthView

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="csrf-token"),
    re_path(
        r"^auth/o/(?P<provider>\S+)/$",
        NetworkProviderAuthView.as_view(),
        name="network-provider-auth",
    ),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path("auth/", include("djoser.social.urls")),
]
