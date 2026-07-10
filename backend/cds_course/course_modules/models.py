import uuid
from django.db import models
class CourseModule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=255)
    order_index = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["order_index"]
        constraints = [models.UniqueConstraint(fields=["course", "order_index"], name="unique_course_module_order")]
