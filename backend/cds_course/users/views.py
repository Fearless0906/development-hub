import ipaddress
from urllib.parse import urlparse

from django.conf import settings as django_settings
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from social_django.utils import load_backend, load_strategy

from djoser.conf import settings as djoser_settings
from djoser.social.views import ProviderAuthView


def is_allowed_development_redirect(redirect_uri, provider):
    if not django_settings.DEBUG or not redirect_uri:
        return False

    try:
        parsed = urlparse(redirect_uri)
        address = ipaddress.ip_address(parsed.hostname or "")
    except ValueError:
        return False

    callback_provider = "google" if provider == "google-oauth2" else provider
    return (
        address.is_private
        and parsed.scheme in {"http", "https"}
        and parsed.port in {5173, 8080}
        and parsed.path == f"/auth/callback/{callback_provider}"
        and not parsed.params
        and not parsed.query
        and not parsed.fragment
    )


class NetworkProviderAuthView(ProviderAuthView):
    """Allow exact configured redirects plus safe private-LAN redirects in DEBUG."""

    def get(self, request, *args, **kwargs):
        redirect_uri = request.GET.get("redirect_uri")
        provider = self.kwargs["provider"]
        is_configured = redirect_uri in djoser_settings.SOCIAL_AUTH_ALLOWED_REDIRECT_URIS

        if not is_configured and not is_allowed_development_redirect(
            redirect_uri,
            provider,
        ):
            return Response(
                "redirect_uri must be in SOCIAL_AUTH_ALLOWED_REDIRECT_URIS",
                status=status.HTTP_400_BAD_REQUEST,
            )

        strategy = load_strategy(request)
        strategy.session_set("redirect_uri", redirect_uri)
        backend = load_backend(strategy, provider, redirect_uri=redirect_uri)
        return Response(data={"authorization_url": backend.auth_url()})


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        return JsonResponse({"detail": "CSRF cookie set"})
