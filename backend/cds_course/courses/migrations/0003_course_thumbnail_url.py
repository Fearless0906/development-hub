from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="thumbnail_url",
            field=models.URLField(blank=True),
        ),
    ]
