# Python HTTP and gRPC demo

This ODS-owned fixture exercises static extraction for:

- FastAPI and Flask decorators;
- Django `urlpatterns`, including a resolvable `include()` chain;
- httpx, requests, and aiohttp outgoing calls;
- a grpcio generated-stub call paired with the `demo.v1.OrdersService`
  protocol definition.

The source files are extraction inputs. Running the applications is not
required for parser tests, and no framework dependency installation is
needed for static analysis.
