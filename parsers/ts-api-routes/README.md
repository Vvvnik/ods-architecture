# ts-api-routes parser (013)

Extracts Fastify HTTP routes from `.ts`/`.js` (path literals and
`const prefix` + template in the same file) → native model `routes[]`.

CLI: `node run.mjs` (`005` contract).

Contract: `specs/013-api-routes-from-code/contracts/native-ts-api-routes.schema.json`.
