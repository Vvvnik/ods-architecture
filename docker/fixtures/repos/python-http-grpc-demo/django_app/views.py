from django.shortcuts import render


def home(request):
    return render(request, "home.html")


def health(request):
    return {"status": "ok"}


def orders(request):
    return []


def order(request, pk: int):
    return {"id": pk}
