import { basename, dirname } from 'node:path';
import { posixPath } from '../_shared/java-spring/extract.mjs';

function tag(xml, name) {
  return xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))?.[1]?.trim() ?? null;
}

export function parsePom(xml, sourcePath = 'pom.xml') {
  const parentXml = xml.match(/<parent>([\s\S]*?)<\/parent>/i)?.[1] ?? '';
  const projectWithoutParent = xml.replace(/<parent>[\s\S]*?<\/parent>/i, '');
  const artifactId = tag(projectWithoutParent, 'artifactId');
  if (!artifactId) return null;
  const packaging = tag(projectWithoutParent, 'packaging') ?? 'jar';
  const hasBootPlugin = /<artifactId>\s*spring-boot-maven-plugin\s*<\/artifactId>/i.test(xml);
  const hasBootStarter = /<artifactId>\s*spring-boot-starter(?:-[^<\s]+)?\s*<\/artifactId>/i.test(xml);
  const disabledBoot = /<skip>\s*true\s*<\/skip>/i.test(xml);
  const moduleDir = posixPath(dirname(sourcePath));
  return {
    path: moduleDir === '.' ? 'pom.xml' : moduleDir,
    group_id: tag(projectWithoutParent, 'groupId') ?? tag(parentXml, 'groupId'),
    artifact_id: artifactId,
    packaging,
    is_boot_app: packaging.toLowerCase() !== 'pom' && !disabledBoot && (hasBootPlugin || hasBootStarter),
    service_name_hint: artifactId,
    parent_artifact_id: tag(parentXml, 'artifactId'),
  };
}

export function extractMavenModules(files) {
  return files
    .map(({ path, content }) => parsePom(content, path))
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path));
}
