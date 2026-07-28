import aiohttp

SERVICE = "django_app"


async def list_orders():
    async with aiohttp.ClientSession() as session:
        async with session.get("http://django_app:8000/api/orders/") as response:
            return await response.json()
