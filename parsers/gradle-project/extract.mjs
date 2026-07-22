import { basename, dirname } from 'node:path';
import { posixPath } from '../_shared/java-spring/extract.mjs';

const BOOT_PLUGIN =
  /(?:^|[\s{(])id\s*(?:\(\s*)?['"]org\.springframework\.boot['"]\s*\)?/m;
const BOOT_STARTER = /org\.springframework\.boot:spring-boot-starter/;
const BOOT_JAR_DISABLED =
  /(?:bootJar|tasks\.named\s*\(\s*['"]bootJar['"]\s*\))\s*\{[\s\S]*?\benabled\s*=\s*false\b/;

function quotedAssignment(content, keys) {
  for (const key of keys) {
    const match = content.match(
      new RegExp(
        `(?:^|\\n)\\s*(?:rootProject\\.)?${key}\\s*=\\s*['"]([^'"]+)['"]`,
        'm',
      ),
    );
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Parse a Gradle build script into a reactor-module descriptor (Maven-shaped).
 * settings.gradle(.kts) is not a module.
 */
export function parseBuildGradle(content, sourcePath = 'build.gradle') {
  const fileName = basename(sourcePath);
  if (fileName === 'settings.gradle' || fileName === 'settings.gradle.kts') {
    return null;
  }
  if (fileName !== 'build.gradle' && fileName !== 'build.gradle.kts') {
    return null;
  }

  const moduleDir = posixPath(dirname(sourcePath));
  const dirHint = moduleDir === '.' ? 'root' : basename(moduleDir);
  const artifactId =
    quotedAssignment(content, ['name', 'archivesBaseName', 'archivesName']) ?? dirHint;

  const groupId = quotedAssignment(content, ['group']);
  const hasBootPlugin = BOOT_PLUGIN.test(content);
  const hasBootStarter = BOOT_STARTER.test(content);
  const disabledBoot = BOOT_JAR_DISABLED.test(content);

  return {
    path: moduleDir === '.' ? fileName : moduleDir,
    group_id: groupId,
    artifact_id: artifactId,
    packaging: 'jar',
    is_boot_app: !disabledBoot && (hasBootPlugin || hasBootStarter),
    service_name_hint: artifactId,
    parent_artifact_id: null,
    build_file: fileName,
  };
}

export function extractGradleModules(files) {
  return files
    .map(({ path, content }) => parseBuildGradle(content, path))
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path));
}
