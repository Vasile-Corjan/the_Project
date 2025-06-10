from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes 
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, ProjectSerializer
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import viewsets
from main_app.models import Project


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    
    def get_token(cls, user):
      token = super().get_token(user)
      return token 

    def validate(self, attrs):
      data = super().validate(attrs)
      data['username'] = self.user.username
      return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

@api_view(['GET'])
def getRoutes(request):
  routes = ['/api/token','/api/token/refresh']
  return Response(routes,)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    return Response({
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name
    })

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class ProjectViewSet(viewsets.ModelViewSet):
   serializer_class = ProjectSerializer
   permission_classes = [IsAuthenticated]

   def get_queryset(self):
      return Project.objects.filter(owner=self.request.user).order_by('-created_at')
   
   def perform_create(self, serializer):
      serializer.save(owner=self.request.user)