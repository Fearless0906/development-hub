import uuid
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Course(models.Model):
    class Level(models.TextChoices):
        BEGINNER = "Beginner"
        INTERMEDIATE = "Intermediate"
        ADVANCED = "Advanced"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    slug = models.SlugField(unique=True)
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.BEGINNER)
    duration = models.CharField(max_length=100, blank=True, null=True)
    icon = models.CharField(max_length=100, default="Code")
    thumbnail_url = models.URLField(blank=True)
    students_count = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    instructor_name = models.CharField(max_length=255, blank=True)
    instructor_avatar = models.URLField(blank=True)
    instructor_title = models.CharField(max_length=255, blank=True)
    topics = models.JSONField(default=list, blank=True)
    learn_outcomes = models.JSONField(default=list, blank=True)
    prerequisites = models.JSONField(default=list, blank=True)
    projects_included = models.JSONField(default=list, blank=True)
    is_progressive = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_courses")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
