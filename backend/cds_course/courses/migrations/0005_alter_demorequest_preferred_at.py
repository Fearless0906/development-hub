from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0004_demorequest"),
    ]

    operations = [
        migrations.AlterField(
            model_name="demorequest",
            name="preferred_at",
            field=models.DateField(),
        ),
    ]
