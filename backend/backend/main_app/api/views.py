from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer



@api_view(['GET'])
def getRoutes(request):
  routes = ['/api/token','/api/token/refresh']
  return Response(routes,)

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
