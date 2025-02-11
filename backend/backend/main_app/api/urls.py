from django.urls import path
from . import views
from rest_framework_simplejwt.views import (
  TokenRefreshView,
  TokenObtainPairView
)
from .views import CreateUserView

urlpatterns = [
  path('', views.getRoutes),
  path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
  path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
  path('user/register/', CreateUserView.as_view(), name='register')
]