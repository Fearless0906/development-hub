import uuid
from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator,MinValueValidator
from django.db import models
User=get_user_model()
class UserCourseProgress(models.Model):
 id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="course_progress"); course=models.ForeignKey("courses.Course",on_delete=models.CASCADE,related_name="user_progress"); completed_lessons=models.JSONField(default=list,blank=True); progress_percent=models.PositiveIntegerField(default=0,validators=[MinValueValidator(0),MaxValueValidator(100)]); last_lesson=models.ForeignKey("lessons.Lesson",null=True,blank=True,on_delete=models.SET_NULL,related_name="last_viewed_by"); started_at=models.DateTimeField(auto_now_add=True); completed_at=models.DateTimeField(null=True,blank=True)
 class Meta: constraints=[models.UniqueConstraint(fields=["user","course"],name="unique_user_course_progress")]
