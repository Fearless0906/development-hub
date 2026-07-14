import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0003_course_thumbnail_url"),
    ]

    operations = [
        migrations.CreateModel(
            name="DemoRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("email", models.EmailField(max_length=254)),
                ("company", models.CharField(blank=True, max_length=255)),
                ("preferred_at", models.DateTimeField()),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
