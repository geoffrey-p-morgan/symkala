# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2016-01-20 23:14
from __future__ import unicode_literals

import datetime
from django.db import migrations, models
from django.utils.timezone import utc


class Migration(migrations.Migration):

    dependencies = [
        ('symkalaweb', '0005_auto_20160120_1814'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='key_expires',
            field=models.DateTimeField(default=datetime.datetime(2016, 1, 20, 23, 14, 34, 960000, tzinfo=utc)),
        ),
    ]
