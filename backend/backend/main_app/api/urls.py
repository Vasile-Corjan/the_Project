from django.urls import path, include
from . import views 
from rest_framework_simplejwt.views import (
  TokenRefreshView,
  TokenBlacklistView
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('projects', views.ProjectViewSet, basename='projects')
#router.register('files', views.UploadFilesView, basename='files')

urlpatterns = [
  path('', views.getRoutes),
  path('signin/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
  path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
  path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
  path('register/user/', views.CreateUserView.as_view(), name='register'),
  path('profile/user/', views.user_profile, name='user_profile'),
  path('', include(router.urls)),
  path('projects/<int:project_pk>/files/',views.UploadFilesView.as_view(),name='files'),
  path('projects/<int:project_pk>/files/<int:file_id>/',views.UploadFilesView.as_view(),name='file-detail')
]