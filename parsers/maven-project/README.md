# maven-project

Artifact-парсер Maven reactor. Читает все `pom.xml`, возвращает `modules[]`
по контракту 019 и помечает deployable Spring Boot jar/war как
`is_boot_app`. Parent/aggregator с `packaging=pom` сервисом не считается.

Запуск выполняется оркестратором через `node run.mjs`.
Общий код нормализации Spring/Java находится в `../_shared/java-spring/`.
