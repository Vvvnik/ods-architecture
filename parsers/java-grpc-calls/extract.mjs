export function extractJavaGrpcCalls(sourceText, sourcePath) {
  const calls = [];
  const serviceHint = String(sourcePath).replace(/\\/g, '/').split('/')[0] ?? null;
  const stubToService = new Map();
  const stubRe = /(\w+)\s*=\s*(\w+)Grpc\s*\.\s*new(?:Blocking|Future|Stub)\w*\s*\(/g;
  let match;
  while ((match = stubRe.exec(sourceText)) !== null) {
    stubToService.set(match[1], match[2]);
  }

  const callRe = /(\w+)\s*\.\s*([A-Za-z0-9_]+)\s*\(/g;
  while ((match = callRe.exec(sourceText)) !== null) {
    const service = stubToService.get(match[1]);
    if (!service) continue;
    calls.push({
      source_path: sourcePath,
      target_service: service,
      target_method: match[2],
      method: `${service}/${match[2]}`,
      service_hint: serviceHint,
    });
  }
  return calls;
}
