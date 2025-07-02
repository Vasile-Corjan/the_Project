import os
from django.contrib.auth.models import User
from django.http import FileResponse
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

 # In your Django view that handles file retrieval
  def get(self, request, project_pk=None, file_id=None):
    try:
      # If no file_id, return list of files for the project
      if not file_id:
          files = ProjectFiles.objects.filter(project_id=project_pk)
          serializer = self.serializer_class(files, many=True)
          return Response(serializer.data)
          
      # Get specific file
      file_obj = ProjectFiles.objects.get(id=file_id, project_id=project_pk)
      file_path = file_obj.file.path
      
      # Verify the file exists and has content
      if not os.path.exists(file_path):
          return Response({"error": "File not found on disk"}, status=status.HTTP_404_NOT_FOUND)
          
      if os.path.getsize(file_path) == 0:
          return Response({"error": "File is empty"}, status=status.HTTP_400_BAD_REQUEST)
      
      # Get the file extension to determine content type
      file_type = file_obj.file_type.lower() if file_obj.file_type else ''
      
      # Determine appropriate content type
      content_type = self.get_content_type(file_type)
      
      # Open the file and create FileResponse
      file_handle = open(file_path, 'rb')
      
      # Set the proper content type for the response
      response = FileResponse(
          file_handle,  # FileResponse will handle closing the file
          content_type=content_type
      )
      
      # For IFC files, don't force download, just serve the content
      if file_type == 'ifc':
          # For IFC files that need to be processed by the viewer
          response['Content-Disposition'] = f'inline; filename="{file_obj.name}.{file_obj.file_type}"'
      else:
          # For other files, suggest download
          response['Content-Disposition'] = f'attachment; filename="{file_obj.name}.{file_obj.file_type}"'
      
      # Add CORS headers to ensure the browser can access the file
      response["Access-Control-Allow-Origin"] = "*"
      response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
      response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
      
      # For debugging - add response details
      print(f"Serving file: {file_path}")
      print(f"Content-Type: {content_type}")
      print(f"File size: {os.path.getsize(file_path)} bytes")
      
      return response
        
    except ProjectFiles.DoesNotExist:
        return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        print(f"Error retrieving file: {str(e)}")
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

  def get_content_type(self, file_type):
    """Determine the MIME type based on file extension"""
    content_types = {
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg', 
        'png': 'image/png',
        'gif': 'image/gif',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ifc': 'application/octet-stream',  # IFC files as binary
    }
    
    return content_types.get(file_type.lower(), 'application/octet-stream')

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
  