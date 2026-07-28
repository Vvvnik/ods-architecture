function packageName(sourceText) {
  const match = sourceText.match(/\bpackage\s+([A-Za-z0-9_.]+)\s*;/);
  return match ? match[1] : '';
}

export function extractGrpcProto(sourceText, sourcePath) {
  const services = [];
  const pkg = packageName(sourceText);
  const serviceRe = /service\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let serviceMatch;
  while ((serviceMatch = serviceRe.exec(sourceText)) !== null) {
    const name = serviceMatch[1];
    const body = serviceMatch[2];
    const methods = [];
    const rpcRe = /rpc\s+(\w+)\s*\(([^)]*)\)\s+returns\s*\(([^)]*)\)/g;
    let rpcMatch;
    while ((rpcMatch = rpcRe.exec(body)) !== null) {
      methods.push({
        name: rpcMatch[1],
        client_streaming: rpcMatch[2].trim().startsWith('stream '),
        server_streaming: rpcMatch[3].trim().startsWith('stream '),
      });
    }
    services.push({
      package: pkg,
      name,
      source_path: sourcePath,
      service_hint: null,
      methods,
    });
  }
  return services;
}
