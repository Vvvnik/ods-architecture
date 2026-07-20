# java-http-webclient-demo

Минимальная fixture 019: два Boot-модуля (`visits-service`, `webclient-service`).

- `visits-service` — MVC `POST /visits` и `GET /visits/{id}` + локальный
  `application.yml` (порт / H2).
- `webclient-service` — исходящие вызовы WebClient и Feign к `visits-service`.

Используется для SC-007 (оба стиля клиента) и SC-006 (config), если эталон
petclinic не покрывает Feign/WebClient.
