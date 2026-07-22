import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBuildGradle, extractGradleModules } from './extract.mjs';

test('Spring Boot plugin marks Groovy module as application', () => {
  const result = parseBuildGradle(
    `plugins {
  id 'org.springframework.boot' version '3.2.0'
  id 'java'
}
group = 'com.example'
`,
    'customers-service/build.gradle',
  );
  assert.equal(result.is_boot_app, true);
  assert.equal(result.artifact_id, 'customers-service');
  assert.equal(result.group_id, 'com.example');
  assert.equal(result.path, 'customers-service');
});

test('Kotlin DSL Boot plugin and starter detect application', () => {
  const result = parseBuildGradle(
    `plugins {
  id("org.springframework.boot") version "3.2.0"
}
dependencies {
  implementation("org.springframework.boot:spring-boot-starter-web")
}
`,
    'api/build.gradle.kts',
  );
  assert.equal(result.is_boot_app, true);
  assert.equal(result.artifact_id, 'api');
  assert.equal(result.build_file, 'build.gradle.kts');
});

test('explicit name overrides directory', () => {
  const result = parseBuildGradle(
    `name = 'vets-service'
plugins { id 'org.springframework.boot' }
`,
    'module-a/build.gradle',
  );
  assert.equal(result.artifact_id, 'vets-service');
  assert.equal(result.service_name_hint, 'vets-service');
});

test('library without Boot is not an application', () => {
  const result = parseBuildGradle(
    `plugins { id 'java-library' }
dependencies { api 'com.google.guava:guava:32.0.0' }
`,
    'library/build.gradle',
  );
  assert.equal(result.is_boot_app, false);
});

test('disabled bootJar is not an application', () => {
  const result = parseBuildGradle(
    `plugins { id 'org.springframework.boot' }
bootJar { enabled = false }
`,
    'lib/build.gradle',
  );
  assert.equal(result.is_boot_app, false);
});

test('settings.gradle is skipped', () => {
  assert.equal(parseBuildGradle('rootProject.name = "demo"', 'settings.gradle'), null);
  assert.equal(
    extractGradleModules([{ path: 'settings.gradle', content: 'include "a"' }]).length,
    0,
  );
});
