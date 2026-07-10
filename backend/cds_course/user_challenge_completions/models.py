import uuid
from django.contrib.auth import get_user_model
from django.db import models
User=get_user_model()
class UserChallengeCompletion(models.Model):
 id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="challenge_completions"); lesson=models.ForeignKey("lessons.Lesson",on_delete=models.CASCADE,related_name="challenge_completions"); challenge_id=models.CharField(max_length=255); completed_at=models.DateTimeField(auto_now_add=True); code_submitted=models.TextField(blank=True)
 class Meta: constraints=[models.UniqueConstraint(fields=["user","lesson","challenge_id"],name="unique_challenge_completion")]
