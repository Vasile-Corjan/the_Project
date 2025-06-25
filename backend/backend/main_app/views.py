from rest_framework import generics
from rest_framework.permissions import AllowAny
from .api.serializers import UserSerializer
from django.contrib.auth.models import User

""" class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny] """