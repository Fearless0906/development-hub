import uuid
from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator,MinValueValidator
from django.db import models
User=get_user_model()
class CourseReview(models.Model):
 id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="course_reviews"); course=models.ForeignKey("courses.Course",on_delete=models.CASCADE,related_name="reviews"); rating=models.PositiveSmallIntegerField(validators=[MinValueValidator(1),MaxValueValidator(5)]); review=models.TextField(blank=True); created_at=models.DateTimeField(auto_now_add=True); updated_at=models.DateTimeField(auto_now=True)
 class Meta: constraints=[models.UniqueConstraint(fields=["user","course"],name="unique_course_review")]
