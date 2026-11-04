import os
import hashlib
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class Project(models.Model):

  visibility_choices = [('public', 'Public'), ('private', 'Private')]

  name = models.CharField(max_length=100)
  owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  description = models.TextField(blank=True,null=True)
  visibility = models.CharField(max_length=10, choices=visibility_choices, default='public')

  def __str__(self):
    return self.name


def validate_file_size(value):
  filesize = value.size
  if filesize > 500 * 1024 * 1024:
    raise ValidationError("The maximum file size exceeds the allowed limit")

def validate_file_type(value):
  valid_types = ['ifc', 'dwg', 'pdf', 'jpg', 'jpeg', 'png', 'svg']
  ext = os.path.splitext(value.name)[1][1:].lower()
  if ext not in valid_types:
    raise ValidationError(f'Unsupported file type. Allowed: {",".join(valid_types)}')

class ProjectFiles(models.Model):
  FILE_TYPE_CHOICE = [('ifc', 'IFC'),
                      ('dwg', 'DWG'),
                      ('pdf', 'PDF'),
                      ('jpg', 'JPG'),
                      ('jpeg', 'JPEG'),
                      ('png', 'PNG'),
                      ('svg', 'SVG')]
  project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='files')
  file = models.FileField(upload_to='project_files/%Y/%m/%d/', validators=[validate_file_size, validate_file_type])
  filename = models.CharField(max_length=255)
  file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICE)
  mime_type = models.CharField(max_length=100, blank=True, null=True)
  size = models.PositiveIntegerField()
  file_hash = models.CharField(max_length=64, blank=True, null=True, db_index=True)
  version = models.PositiveIntegerField(default=0)
  uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
  uploaded_at = models.DateTimeField(auto_now_add=True)
  is_deleted = models.BooleanField(default=False, db_index=True)
  deleted_at = models.DateTimeField(null=True, blank=True)

  class Meta:
    ordering = ['-uploaded_at']
    indexes = [models.Index(fields=['project', 'file_type']),
               models.Index(fields=['uploaded_by'])]
  def __str__(self):
    return self.filename

  def save(self, *args, **kwargs):
    if self.file and not self.file_hash:
      self.file.open('rb')
      file_hash = hashlib.sha256(self.file.read()).hexdigest()
      self.file_hash = file_hash
      self.file.seek(0)

    if not self.mime_type and self.file_type:
      mime_types = {'ifc': 'application/octet-stream',
                        'dwg': 'application/acad',
                        'pdf': 'application/pdf',
                        'jpg': 'image/jpeg',
                        'jpeg': 'image/jpeg',
                        'png': 'image/png',
                        'svg': 'image/svg+xml'}
      self.mime_type = mime_types.get(self.file_type, 'application/octet-stream')
    super().save(*args, **kwargs)

  """ def delete(self, *args, **kwargs):
    self.is_deleted = True
    self.delete_at = timezone.now()
    self.save() """