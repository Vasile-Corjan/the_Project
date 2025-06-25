import os
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission, IsAdminUser
from rest_framework.decorators import api_view, permission_classes 
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import viewsets, status, generics
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from main_app.models import Project, ProjectFiles
from .serializers import UserSerializer, ProjectSerializer, ProjectFileSerializer


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
  routes = ['/api/signin','/api/token/refresh']
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

  def list(self, request, *args, **kwargs):
    queryset = self.get_queryset()
    serializer = self.get_serializer(queryset, many=True)
    return Response(serializer.data)

class UploadFilesView(APIView):
  serializer_class = ProjectFileSerializer
  permission_classes = [IsAuthenticated]
  parser_classes = [MultiPartParser, FormParser]

  def get(self, request, project_pk=None):
    # Filter files by project
    if project_pk:
      files = ProjectFiles.objects.filter(project_id=project_pk)
    else:
      return Response({"error": "Project ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Optional: Filter by file type
    file_type = request.query_params.get('file_type')
    if file_type:
        files = files.filter(file_type=file_type)
        
    serializer = ProjectFileSerializer(files, many=True)
    return Response(serializer.data)

  def post(self, request, project_pk=None):
    if not project_pk:
      return Response({"error": "Project ID is required"}, status=status.HTTP_400_BAD_REQUEST)
      
    file_obj = request.FILES.get('file')
    if not file_obj:
      return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
    else:
      filename = file_obj.name
      name_parts = filename.split('.')
      basename = name_parts[0]
      extension = name_parts[1]

    try:
      project = Project.objects.get(id=project_pk)
      file_data = {
        'project': project.id,
        'file': file_obj,
        'name': basename,
        'uploaded_by': request.user.id,
        'size': file_obj.size,
        'file_type': extension.lower()
    } 
      serializer = ProjectFileSerializer(data= file_data)
    
      if serializer.is_valid():
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
      else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    except Project.DoesNotExist:
      return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
  
  def delete(self, request, project_pk=None, file_id=None):
    
    if not file_id:
      return Response({"error": "File ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    project = Project.objects.get(id=project_pk)
    file_obj = ProjectFiles.objects.get(id=file_id, project_id=project.id)

    filename = file_obj.name

    file_obj.delete()

    return Response({"message": f"File '{filename}' delete successfully"},
                    status=status.HTTP_204_NO_CONTENT)


    
# class UploadFilesView(viewsets.ModelViewSet):
#   serializer_class = ProjectFileSerializer
#   permission_classes = [BasePermission]

#   def get_queryset(self):
#     project_id = self.kwargs.get('project_pk')
#     return ProjectFiles.objects.filter(project_id=project_id)
    
#   def perform_create(self, serializer):
#     project_id = self.kwargs.get('project_pk')
#     project = Project.objects.get(id=project_id)

#     file_obj = self.request.FILES.get('files')
#     if not file_obj:
#       return Response({"detail": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

#     filename = file_obj.name
#     size = file_obj.size
#     file_type = os.path.splitext(filename)[1][1:].lower()

#     serializer.save(
#       project=project,
#       uploaded_by = self.request.user,
#       size = size,
#       file_type = file_type
#     )
  