def health(request):
    return {"status": "ok"}


def orders(request):
    return []


def order(request, pk: int):
    return {"id": pk}
