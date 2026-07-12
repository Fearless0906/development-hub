import uuid
from django.db import models
class Lesson(models.Model):
    class CompletionRule(models.TextChoices):
        MANUAL="manual"; READ="read"; QUIZ="quiz"; CHALLENGE="challenge"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey("course_modules.CourseModule", on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, null=True)
    duration = models.CharField(max_length=100, blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)
    order_index = models.PositiveIntegerField(default=0)
    quiz = models.JSONField(default=list, blank=True)
    challenge = models.JSONField(null=True, blank=True)
    completion_rule = models.CharField(max_length=20, choices=CompletionRule.choices, default=CompletionRule.MANUAL)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["order_index"]
        constraints = [models.UniqueConstraint(fields=["module", "order_index"], name="unique_module_lesson_order")]
