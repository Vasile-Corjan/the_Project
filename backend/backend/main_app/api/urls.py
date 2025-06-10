from django.urls import path, include
from . import views 
from rest_framework_simplejwt.views import (
  TokenRefreshView,
  TokenBlacklistView
)
from rest_framework.routers import DefaultRouter



router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet, basename='project')

urlpatterns = [
  path('', views.getRoutes),
  path('token/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
  path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
  path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
  path('user/register/', views.CreateUserView.as_view(), name='register'),
  path('user/profile/', views.user_profile, name='user_profile'),
  path('', include(router.urls))
]