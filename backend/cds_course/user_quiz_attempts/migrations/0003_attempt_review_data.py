from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user_quiz_attempts", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="userquizattempt",
            name="pass_score",
            field=models.PositiveIntegerField(default=70),
        ),
        migrations.AddField(
            model_name="userquizattempt",
            name="selected_answers",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="userquizattempt",
            name="question_results",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
