import uuid
from django.contrib.auth import get_user_model
from django.db import models
User=get_user_model()
class Notification(models.Model):
 id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="notifications"); type=models.CharField(max_length=50); title=models.CharField(max_length=255); message=models.TextField(); link=models.CharField(max_length=500,blank=True); is_read=models.BooleanField(default=False); actor=models.ForeignKey(User,null=True,blank=True,on_delete=models.SET_NULL,related_name="triggered_notifications"); created_at=models.DateTimeField(auto_now_add=True)
 class Meta: ordering=["-created_at"]
