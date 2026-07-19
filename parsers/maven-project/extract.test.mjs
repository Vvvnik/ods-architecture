import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePom } from './extract.mjs';

test('Spring Boot plugin marks jar module as application', () => {
  const result = parsePom('<project><groupId>x</groupId><artifactId>customers-service</artifactId><build><plugins><plugin><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build></project>', 'customers/pom.xml');
  assert.equal(result.is_boot_app, true);
  assert.equal(result.artifact_id, 'customers-service');
});

test('parent pom and plain library are not applications', () => {
  assert.equal(parsePom('<project><artifactId>parent</artifactId><packaging>pom</packaging><artifactId>spring-boot-starter</artifactId></project>').is_boot_app, false);
  assert.equal(parsePom('<project><artifactId>library</artifactId></project>').is_boot_app, false);
});
