import uuid
from django.contrib.auth import get_user_model
from django.db import models
User=get_user_model()
class UserQuizAttempt(models.Model):
 id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="quiz_attempts"); lesson=models.ForeignKey("lessons.Lesson",on_delete=models.CASCADE,related_name="quiz_attempts"); score=models.PositiveIntegerField(); total=models.PositiveIntegerField(); passed=models.BooleanField(default=False); pass_score=models.PositiveIntegerField(default=70); selected_answers=models.JSONField(default=list,blank=True); question_results=models.JSONField(default=list,blank=True); attempted_at=models.DateTimeField(auto_now_add=True)
 class Meta: ordering=["-attempted_at"]
