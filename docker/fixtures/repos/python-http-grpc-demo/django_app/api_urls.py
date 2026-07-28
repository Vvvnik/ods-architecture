from django.urls import path

from django_app import views

urlpatterns = [
    path("orders/", views.orders),
    path("orders/<int:pk>/", views.order),
]
