import { dirname, basename } from 'node:path';

export const MAPPING_METHODS = {
  GetMapping: 'GET',
  PostMapping: 'POST',
  PutMapping: 'PUT',
  PatchMapping: 'PATCH',
  DeleteMapping: 'DELETE',
};

export function posixPath(value) {
  return value.replace(/\\/g, '/');
}

export function normalizeHttpPath(...parts) {
  const joined = parts.filter(Boolean).join('/');
  const normalized = `/${joined}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return normalized || '/';
}

export function firstAnnotationLiteral(args = '') {
  const match = args.match(/(?:value|path)\s*=\s*(?:\{\s*)?["']([^"']+)["']|["']([^"']+)["']/s);
  return match?.[1] ?? match?.[2] ?? '';
}

export function requestMappingMethod(args = '') {
  const match = args.match(/RequestMethod\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)/);
  return match?.[1] ?? null;
}

export function serviceHintFromPath(sourcePath) {
  const parts = posixPath(sourcePath).split('/').filter(Boolean);
  let hint;
  const javaIndex = parts.lastIndexOf('java');
  if (javaIndex > 0) {
    const srcIndex = parts.lastIndexOf('src');
    if (srcIndex > 0) hint = parts[srcIndex - 1].toLowerCase();
  }
  if (!hint) {
    const resourceIndex = parts.findIndex((part) => part === 'resources');
    if (resourceIndex > 0) {
      const srcIndex = parts.lastIndexOf('src', resourceIndex);
      if (srcIndex > 0) hint = parts[srcIndex - 1].toLowerCase();
    }
  }
  if (!hint) {
    const parent = basename(dirname(sourcePath));
    hint = ['src', 'main', 'java', 'resources'].includes(parent.toLowerCase())
      ? undefined
      : parent.toLowerCase();
  }
  if (!hint) return undefined;
  return shortenMonorepoModuleHint(hint);
}

/**
 * Module dirs often `{org}-{product}-{deployable…}` (4+ hyphen tokens).
 * Drop the leading org+product pair for compose/display alignment:
 * `acme-platform-customers-service` → `customers-service`.
 */
export function shortenMonorepoModuleHint(hint) {
  const dashed = hint.replace(/_/g, '-').toLowerCase();
  const parts = dashed.split('-').filter(Boolean);
  if (parts.length >= 4) {
    return parts.slice(2).join('-');
  }
  return dashed;
}

export function annotationBlocks(sourceText) {
  const blocks = [];
  const regex = /@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)\s*(?:\(([\s\S]*?)\))?/g;
  let match;
  while ((match = regex.exec(sourceText))) {
    blocks.push({ name: match[1], args: match[2] ?? '', index: match.index, end: regex.lastIndex });
  }
  return blocks;
}
