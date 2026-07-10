from django.db import models
class QuestionTag(models.Model):
    question = models.ForeignKey("questions.Question", on_delete=models.CASCADE, related_name="question_tags")
    tag = models.ForeignKey("tags.Tag", on_delete=models.CASCADE, related_name="question_tags")
    class Meta: constraints = [models.UniqueConstraint(fields=["question", "tag"], name="unique_question_tag")]
