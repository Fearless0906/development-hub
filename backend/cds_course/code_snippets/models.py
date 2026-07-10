import uuid
from django.conf import settings
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class CodeSnippet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="code_snippets")
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    code = models.TextField()
    language = models.CharField(max_length=100, default="javascript")
    is_public = models.BooleanField(default=True)
    views_count = models.PositiveIntegerField(default=0)
    votes_count = models.IntegerField(default=0)
    forks_count = models.PositiveIntegerField(default=0)
    forked_from = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="forks")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
