import uuid
from django.contrib.auth import get_user_model
from django.db import models
User=get_user_model()
class UserRole(models.Model):
    class Role(models.TextChoices): ADMIN="admin"; MODERATOR="moderator"; USER="user"
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="roles")
    role=models.CharField(max_length=20,choices=Role.choices)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta: constraints=[models.UniqueConstraint(fields=["user","role"],name="unique_user_role")]
