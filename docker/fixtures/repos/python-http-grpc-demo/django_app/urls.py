from django.urls import include, path

from django_app import views

urlpatterns = [
    path("health/", views.health),
    path("api/", include("django_app.api_urls")),
]
