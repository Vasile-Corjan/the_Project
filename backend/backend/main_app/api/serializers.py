from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from main_app.models import Project, ProjectFiles

class UserSerializer(serializers.ModelSerializer):
  password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
  confirm_password = serializers.CharField(write_only=True, required=True)
  first_name = serializers.CharField(required=True)
  last_name = serializers.CharField(required=True)
  email = serializers.EmailField(required=True)
  class Meta:
    model = User
    fields = ("id", "first_name", "last_name", "username", "password", "confirm_password", "email")

  def validate(self, attrs):
    if attrs['password'] != attrs['confirm_password']:
      raise serializers.ValidationError({"password": "Password fields don't match."})
    
    email = attrs.get('email')
    if User.objects.filter(email=email).exists():
      raise serializers.ValidationError({"email": "A user with this email already exists."})
    
    return attrs

  def create(self, validate_data):
    user = User(
      email = validate_data['email'],
      username = validate_data['username'],
      first_name = validate_data['first_name'],
      last_name = validate_data['last_name']
    )
    user.set_password(validate_data['password'])
    user.save()
    return user

class ProjectSerializer(serializers.ModelSerializer):
  class Meta:
    model = Project
    fields = ('id', 'name', 'created_at', 'updated_at','description')
    read_only_fields = ['owner']


class ProjectFileSerializer(serializers.ModelSerializer):
  #uploaded_by_username = serializers.SerializerMethodField()
  class Meta:
    model = ProjectFiles
    fields = ['id', 'name', 'file', 'project', 'file_type', 'size', 'uploaded_at', 
              'uploaded_by']
    read_only_fields = ['id', 'uploaded_at']

   # def get_uploaded_by_username(self, obj):
    #  return obj.uploaded_by_usernam if obj.uploaded_by else None