import uuid
from django.contrib.auth import get_user_model
from django.db import models
User=get_user_model()
class CourseCertificate(models.Model):
 id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); certificate_id=models.CharField(max_length=255,unique=True); user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="course_certificates"); course=models.ForeignKey("courses.Course",on_delete=models.CASCADE,related_name="certificates"); issued_at=models.DateTimeField(auto_now_add=True)
 class Meta: constraints=[models.UniqueConstraint(fields=["user","course"],name="unique_course_certificate")]
