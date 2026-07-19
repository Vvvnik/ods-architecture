import {
  MAPPING_METHODS, annotationBlocks, firstAnnotationLiteral,
  normalizeHttpPath, requestMappingMethod, serviceHintFromPath,
} from '../_shared/java-spring/extract.mjs';

function extractMvcRoutes(sourceText, sourcePath) {
  if (!/@(?:RestController|Controller)\b/.test(sourceText)) return [];
  const classIndex = sourceText.search(/\b(?:class|interface)\s+\w+/);
  if (classIndex < 0) return [];
  const blocks = annotationBlocks(sourceText);
  const classMapping = blocks.find((block) => block.name === 'RequestMapping' && block.index < classIndex);
  const classPath = firstAnnotationLiteral(classMapping?.args);
  const routes = [];
  for (const block of blocks.filter((entry) => entry.index > classIndex)) {
    const method = MAPPING_METHODS[block.name] ?? requestMappingMethod(block.args);
    if (!method) continue;
    const path = normalizeHttpPath(classPath, firstAnnotationLiteral(block.args));
    const next = sourceText.slice(block.end, block.end + 500);
    const handlerName = next.match(/(?:public|protected|private|static|final|synchronized|\s|<[^>]+>)+[\w<>\[\], ?]+\s+(\w+)\s*\(/)?.[1] ?? null;
    routes.push({
      method, path, source_path: sourcePath.replace(/\\/g, '/'),
      handler_name: handlerName, service_hint: serviceHintFromPath(sourcePath),
      path_complete: true, route_kind: 'mvc',
    });
  }
  return routes;
}

/**
 * SHOULD: static Spring Cloud Gateway Path predicates in YAML (not DoD-blocking).
 * Matches: Path=/api/owners/**  or  Path = /api/vets/**
 */
export function extractGatewayYamlRoutes(sourceText, sourcePath) {
  if (!/spring\.cloud\.gateway|cloud:\s*\n\s*gateway:|predicates:/i.test(sourceText)) {
    return [];
  }
  const routes = [];
  const re = /Path\s*=\s*([^\s,#]+)/gi;
  let match;
  while ((match = re.exec(sourceText))) {
    let path = match[1].replace(/\*\*$/, '').replace(/\*$/, '');
    if (!path.startsWith('/')) path = `/${path}`;
    path = path.replace(/\/+$/, '') || '/';
    routes.push({
      method: 'GET',
      path,
      source_path: sourcePath.replace(/\\/g, '/'),
      handler_name: null,
      service_hint: serviceHintFromPath(sourcePath) ?? 'api-gateway',
      path_complete: true,
      route_kind: 'gateway',
    });
  }
  return routes;
}

export function extractSpringRoutes(sourceText, sourcePath) {
  const posix = sourcePath.replace(/\\/g, '/');
  const routes = /\.(ya?ml|properties)$/i.test(posix)
    ? extractGatewayYamlRoutes(sourceText, posix)
    : extractMvcRoutes(sourceText, posix);
  return [...new Map(routes.map((route) => [`${route.method}|${route.path}|${route.source_path}|${route.route_kind}`, route])).values()];
}
