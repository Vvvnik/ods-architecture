# java-calls-demo (ODS-owned)

Synthetic multi-module fixture for `023-java-calls` DoD.
Contract: `specs/023-java-calls/contracts/java-calls-fixture.md`

Modules use **synthetic** names (`module-alpha`, `module-beta`, packages
`ods.alpha` / `ods.beta`) — not copied from an external pilot monorepo.

| Id | Scenario |
|----|----------|
| F1 | `Service.create` → `Service.save` (instance) |
| F2 | `Service.create` → `Utils.stamp` (static) |
| F3 | `Service.create` → `BetaHelper.help` (cross-module) |
| F4 | `Service.create` → `Clock.now` (interface receiver) |
| F5 | `Overloads.run` → ambiguous `foo` (no edge) |
| F6 | `ServiceTest` under `src/test/java` (no DoD calls) |
| F7 | `ExternalCaller` → `System.out.println` (no project edge) |
