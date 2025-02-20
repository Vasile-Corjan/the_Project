from django.urls import path
from . import views
from .views import MyTokenObtainPairSerializer 
from rest_framework_simplejwt.views import (
  TokenRefreshView,
  TokenBlacklistView
)
from .views import CreateUserView

urlpatterns = [
  path('', views.getRoutes),
  path('token/', MyTokenObtainPairSerializer.as_view(), name='token_obtain_pair'),
  path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
  path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
  path('user/register/', CreateUserView.as_view(), name='register'),
  path('user/profile/', views.user_profile, name='user_profile')
]