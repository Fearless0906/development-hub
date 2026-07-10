import uuid
from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
User=get_user_model()
class Vote(models.Model):
    class VoteableType(models.TextChoices):
        QUESTION="question"; ANSWER="answer"; SNIPPET="snippet"
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    user=models.ForeignKey(User,on_delete=models.CASCADE,related_name="votes")
    voteable_type=models.CharField(max_length=20,choices=VoteableType.choices)
    voteable_id=models.UUIDField()
    value=models.SmallIntegerField(validators=[MinValueValidator(-1),MaxValueValidator(1)])
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta: constraints=[models.UniqueConstraint(fields=["user","voteable_type","voteable_id"],name="unique_user_vote")]
