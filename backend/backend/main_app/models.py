from django.db import models
from django.contrib.auth.models import User

class Project(models.Model):

  visibility_choices = [('public', 'Public'), ('private', 'Private')]

  name = models.CharField(max_length=100)
  owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  description = models.TextField(verbose_name='Description',blank=True,null=True)
  visibility = models.CharField(max_length=10, choices=visibility_choices, default='public')

  def __str__(self):
    return self.name
  

class ProjectFiles(models.Model):
  project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='files')
  file = models.FileField(upload_to='project_files/%Y/%m/%d/')
  name = models.CharField(max_length=255)
  file_type = models.CharField(max_length=50)
  size = models.PositiveIntegerField()
  uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
  uploaded_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return self.name