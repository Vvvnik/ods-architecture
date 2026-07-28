# Python HTTP and gRPC demo

This ODS-owned fixture exercises static extraction for:

- FastAPI and Flask decorators;
- Django `urlpatterns`, including a resolvable `include()` chain;
- httpx, requests, and aiohttp outgoing calls;
- a grpcio generated-stub call paired with the `demo.v1.OrdersService`
  protocol definition;
- server-rendered HTML UIs common in Python stacks:
  FastAPI + Jinja2, Flask + Jinja2, and Django templates;
- a small React SPA under `frontend/` (compose service `frontend`) that
  calls FastAPI `/health`, Flask `/ping`, and Django `/api/orders/` so
  `react-ui` can show a UI landscape and `invokes_api` joins.

ODS Graph **UI layer** comes from the React SPA (`react-ui`). Jinja/Django
templates are realistic source layout for Python apps but are **not** parsed
into `ui_app` / screens today (no Django/Jinja UI parser).

The source files are extraction inputs. Running the applications is not
required for parser tests, and no framework dependency installation is
needed for static analysis.
