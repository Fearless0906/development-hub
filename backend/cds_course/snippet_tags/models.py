from django.db import models
class SnippetTag(models.Model):
    snippet = models.ForeignKey("code_snippets.CodeSnippet", on_delete=models.CASCADE, related_name="snippet_tags")
    tag = models.ForeignKey("tags.Tag", on_delete=models.CASCADE, related_name="snippet_tags")
    class Meta: constraints = [models.UniqueConstraint(fields=["snippet", "tag"], name="unique_snippet_tag")]
