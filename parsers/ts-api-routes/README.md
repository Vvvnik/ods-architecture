# ts-api-routes parser (013)

Извлекает HTTP-маршруты Fastify из `.ts`/`.js` (литералы путей и
`const prefix` + template в том же файле) → native model `routes[]`.

CLI: `node run.mjs` (контракт `005`).

Контракт: `specs/013-api-routes-from-code/contracts/native-ts-api-routes.schema.json`.
