# java-http-webclient-demo

Minimal fixture for 019: two Boot modules (`visits-service`, `webclient-service`).

- `visits-service` — MVC `POST /visits` and `GET /visits/{id}` + local
  `application.yml` (port / H2).
- `webclient-service` — outgoing WebClient and Feign calls to `visits-service`.

Used for SC-007 (both client styles) and SC-006 (config) when the
petclinic reference does not cover Feign/WebClient.
