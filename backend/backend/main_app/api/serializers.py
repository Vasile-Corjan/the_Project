from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password


class UserSerializer(serializers.ModelSerializer):
  password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
  password2 = serializers.CharField(write_only=True, required=True)
  class Meta:
    model = User
    fields = ("id", "username", "password", "password2", "email")
    extra_kwargs = {"password": {"write_only": True}}

  def validate(self, attrs):
    if attrs['password'] != attrs['password2']:
      raise serializers.ValidationError({"password": "Password fields didn't match."})
    return attrs

  def create(self, validate_data):
    user = User(
      email = validate_data['email'],
      username = validate_data['username']
    )
    user.set_password(validate_data['password'])
    user.save()
    return user
