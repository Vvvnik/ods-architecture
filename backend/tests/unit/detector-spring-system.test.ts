import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectArtifacts } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';

describe('Spring system detector', () => {
  it('detects all four artifacts and ignores plain Java', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-spring-'));
    await mkdir(join(root, 'src/main/java'), { recursive: true });
    await mkdir(join(root, 'src/main/resources'), { recursive: true });
    await writeFile(join(root, 'pom.xml'), '<project/>');
    await writeFile(join(root, 'src/main/resources/application.yml'), 'server:\n  port: 8080\n');
    await writeFile(join(root, 'src/main/java/Controller.java'), '@RestController class Controller { @GetMapping("/") void x(){} }');
    await writeFile(join(root, 'src/main/java/Client.java'), '@FeignClient("vets") interface Client {}');
    await writeFile(join(root, 'src/main/java/Plain.java'), 'class Plain {}');
    const paths = await listAllFilePaths(root, []);
    const artifacts = await detectArtifacts(root, paths);
    expect(artifacts.map((entry) => entry.artifact_type)).toEqual(expect.arrayContaining([
      'maven-project', 'spring-config', 'java-api-routes', 'java-http-calls',
    ]));
    expect(artifacts.find((entry) => entry.artifact_type === 'java-api-routes')?.file_count).toBe(1);
  });

  it('detects gradle-project from build.gradle and build.gradle.kts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-gradle-'));
    await mkdir(join(root, 'api'), { recursive: true });
    await writeFile(join(root, 'build.gradle'), "plugins { id 'java' }\n");
    await writeFile(join(root, 'api/build.gradle.kts'), 'plugins { java }\n');
    await writeFile(join(root, 'settings.gradle'), 'include "api"\n');
    await writeFile(join(root, 'gradlew'), '#!/bin/sh\n');
    const paths = await listAllFilePaths(root, []);
    const artifacts = await detectArtifacts(root, paths);
    const gradle = artifacts.find((entry) => entry.artifact_type === 'gradle-project');
    expect(gradle?.parser_id).toBe('gradle-project');
    expect(gradle?.file_count).toBe(2);
  });
});
