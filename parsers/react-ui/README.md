# react-ui parser

Extracts a React SPA UI landscape (apps, routes, screens, styles, surfaces, flows,
controls, client API calls) into the native UI tree model (`schema_version: 1`).

Heuristic / regex based — no TypeScript compiler required. Dogfood target: repo
`frontend/` (React Router + Vite).
