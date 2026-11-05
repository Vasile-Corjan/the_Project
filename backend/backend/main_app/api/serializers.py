from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from main_app.models import Project, ProjectFiles

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
      token = super().get_token(user)
      return token 

    def validate(self, attrs):
      data = super().validate(attrs)
      data['username'] = self.user.username
      return data

class UserSerializer(serializers.ModelSerializer):
  password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
  first_name = serializers.CharField(required=True)
  last_name = serializers.CharField(required=True)
  email = serializers.EmailField(required=True)

  class Meta:
    model = User
    fields = ("id", "first_name", "last_name", "username", "password", "email")

  def validate(self, attrs):
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
    fields = ('id', 'name', 'created_at', 'updated_at','description','visibility')
    read_only_fields = ['owner', 'created_at', 'updated_at']


class ProjectFileSerializer(serializers.ModelSerializer):
  uploaded_by_username = serializers.SerializerMethodField()
  class Meta:
    model = ProjectFiles
    fields = ['id', 'filename', 'file', 'project', 
              'file_type', 'size', 'uploaded_at', 'uploaded_by', 'uploaded_by_username', 'file_hash'
              ]
    read_only_fields = ['id', 'uploaded_at', 'file_hash', 'uploaded_by_username']

  def get_uploaded_by_username(self, obj):
    return obj.uploaded_by.username if obj.uploaded_by else None
