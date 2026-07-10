import uuid
from django.contrib.auth import get_user_model
from django.db import models
User = get_user_model()

class Question(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="questions")
    title = models.CharField(max_length=500)
    content = models.TextField()
    slug = models.SlugField(max_length=550)
    views_count = models.PositiveIntegerField(default=0)
    votes_count = models.IntegerField(default=0)
    answers_count = models.PositiveIntegerField(default=0)
    is_solved = models.BooleanField(default=False)
    accepted_answer = models.ForeignKey("answers.Answer", null=True, blank=True, on_delete=models.SET_NULL, related_name="accepted_for_questions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta: ordering = ["-created_at"]
