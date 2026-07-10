import uuid
from django.contrib.auth import get_user_model
from django.db import models
User=get_user_model()
class UserLessonNote(models.Model):
 id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="lesson_notes"); lesson=models.ForeignKey("lessons.Lesson",on_delete=models.CASCADE,related_name="user_notes"); note=models.TextField(blank=True); created_at=models.DateTimeField(auto_now_add=True); updated_at=models.DateTimeField(auto_now=True)
 class Meta: constraints=[models.UniqueConstraint(fields=["user","lesson"],name="unique_user_lesson_note")]
