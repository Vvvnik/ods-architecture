import { basename } from 'node:path';
import { posixPath, serviceHintFromPath } from '../_shared/java-spring/extract.mjs';

function parseProperties(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const match = trimmed.match(/^([^:=\s]+)\s*[:=]\s*(.*)$/);
    if (match) values[match[1]] = match[2].trim();
  }
  return values;
}

function parseYaml(text) {
  const values = {};
  const stack = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    // Flat Spring style: server.port: 8888
    const flat = line.match(/^\s*([A-Za-z0-9_.-]+)\s*:\s*(.+?)\s*$/);
    if (flat && flat[1].includes('.') && flat[2] && !flat[2].startsWith('|') && !flat[2].startsWith('>')) {
      values[flat[1].trim()] = flat[2].trim().replace(/^['"]|['"]$/g, '');
      continue;
    }
    const match = line.match(/^(\s*)([^:]+):(?:\s*(.*))?$/);
    if (!match) continue;
    const level = Math.floor(match[1].replace(/\t/g, '  ').length / 2);
    stack.length = level;
    stack[level] = match[2].trim();
    const value = (match[3] ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (value) values[stack.filter(Boolean).join('.')] = value;
  }
  return values;
}

export function jdbcEngine(url) {
  if (!url || /\$\{|@\w+@|^\s*$/.test(url)) return null;
  return url.match(/^jdbc:([a-z0-9_-]+):/i)?.[1]?.toLowerCase() ?? null;
}

export function parseSpringConfig(sourcePath, content) {
  const posix = posixPath(sourcePath);
  const values = /\.properties$/i.test(posix) ? parseProperties(content) : parseYaml(content);
  const portRaw = values['server.port'];
  const port = /^\d+$/.test(portRaw ?? '') ? Number(portRaw) : null;
  const datasources = Object.entries(values)
    .filter(([key]) => /^spring\.datasource(?:\.[^.]+)?\.url$/i.test(key))
    .map(([key, jdbc_url]) => ({
      name: key === 'spring.datasource.url' ? 'default' : key.split('.')[2],
      jdbc_url,
      engine: jdbcEngine(jdbc_url),
    }))
    .filter((entry) => entry.engine);
  const serviceHint = serviceHintFromPath(posix);
  return {
    source_path: posix,
    service_hint: serviceHint || null,
    port,
    datasources,
  };
}
