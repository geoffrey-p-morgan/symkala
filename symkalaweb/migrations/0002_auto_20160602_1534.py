# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2016-06-02 19:34
from __future__ import unicode_literals

import datetime
from django.db import migrations, models
import django.db.models.deletion
from django.utils.timezone import utc


class Migration(migrations.Migration):

    dependencies = [
        ('symkalaweb', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Twitter',
            fields=[
                ('file_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='symkalaweb.File')),
                ('tweet', models.CharField(blank=True, max_length=500)),
                ('author', models.CharField(blank=True, max_length=100)),
            ],
            bases=('symkalaweb.file',),
        ),
        migrations.AlterField(
            model_name='file',
            name='file',
            field=models.FileField(blank=True, upload_to='files'),
        ),
        migrations.AlterField(
            model_name='keyword',
            name='name',
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='key_expires',
            field=models.DateTimeField(default=datetime.datetime(2016, 6, 2, 19, 34, 7, 147000, tzinfo=utc)),
        ),
    ]