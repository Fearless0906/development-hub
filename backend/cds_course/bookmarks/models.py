import uuid
from django.contrib.auth import get_user_model
from django.db import models
User=get_user_model()
class Bookmark(models.Model):
    class BookmarkableType(models.TextChoices):
        QUESTION="question"; SNIPPET="snippet"; LESSON="lesson"; COURSE="course"
    id=models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="bookmarks")
    bookmarkable_id=models.UUIDField()
    bookmarkable_type=models.CharField(max_length=20,choices=BookmarkableType.choices)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta: constraints=[models.UniqueConstraint(fields=["user","bookmarkable_id","bookmarkable_type"],name="unique_bookmark")]
