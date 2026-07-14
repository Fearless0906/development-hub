from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings

from .pipeline import update_oauth_profile
from .views import is_allowed_development_redirect

User = get_user_model()


class OAuthProfilePipelineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="oauth@example.com",
            password=None,
        )

    def test_google_picture_is_saved_as_avatar(self):
        update_oauth_profile(
            SimpleNamespace(name="google-oauth2"),
            self.user,
            {"picture": "https://example.com/google-avatar.jpg"},
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar_url, "https://example.com/google-avatar.jpg")

    def test_github_avatar_and_username_are_saved(self):
        update_oauth_profile(
            SimpleNamespace(name="github"),
            self.user,
            {
                "avatar_url": "https://example.com/github-avatar.jpg",
                "login": "octocoder",
            },
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar_url, "https://example.com/github-avatar.jpg")
        self.assertEqual(self.user.github_username, "octocoder")


@override_settings(DEBUG=True)
class DevelopmentOAuthRedirectTests(SimpleTestCase):
    def test_private_lan_google_callback_is_allowed(self):
        self.assertTrue(
            is_allowed_development_redirect(
                "http://192.168.1.20:8080/auth/callback/google",
                "google-oauth2",
            ),
        )

    def test_public_or_wrong_path_redirect_is_rejected(self):
        self.assertFalse(
            is_allowed_development_redirect(
                "https://example.com:8080/auth/callback/google",
                "google-oauth2",
            ),
        )
        self.assertFalse(
            is_allowed_development_redirect(
                "http://192.168.1.20:8080/not-the-callback",
                "google-oauth2",
            ),
        )
