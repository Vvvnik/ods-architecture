export function extractTsGrpcCalls(sourceText, sourcePath) {
  const calls = [];
  const re = /(\w+)Client\s*\.\s*([A-Za-z0-9_]+)\s*\(/g;
  const pascal = (value) => value.charAt(0).toUpperCase() + value.slice(1);
  const serviceHint = String(sourcePath).replace(/\\/g, '/').split('/')[0] ?? null;
  let match;
  while ((match = re.exec(sourceText)) !== null) {
    const base = match[1].endsWith('Service') ? match[1] : `${match[1]}Service`;
    calls.push({
      source_path: sourcePath,
      target_service: pascal(base),
      target_method: match[2],
      method: `${pascal(base)}/${match[2]}`,
      service_hint: serviceHint,
    });
  }
  return calls;
}
