from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase

from .pipeline import update_oauth_profile

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

# Create your tests here.
