import requests

SERVICE = "flask_app"


def ping():
    return requests.get("http://flask_app:5000/ping")
