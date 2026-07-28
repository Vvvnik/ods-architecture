import httpx

SERVICE = "fastapi_app"


def check_health():
    return httpx.get("http://fastapi_app:8000/health")
