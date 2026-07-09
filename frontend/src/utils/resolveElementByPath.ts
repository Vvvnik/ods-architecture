import { listChildren } from '../api/elements.js';
import type { Element } from '../api/models.js';

const PAGE_SIZE = 100;

function normalizePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

/**
 * Resolves a workspace element by repository-relative path via the elements API.
 */
export async function resolveElementByPath(
  projectId: string,
  targetPath: string,
): Promise<Element | null> {
  const normalized = normalizePath(targetPath);
  if (!normalized) {
    return null;
  }

  const segments = normalized.split('/');
  let parentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const currentPath = segments.slice(0, i + 1).join('/');
    let found: Element | undefined;
    let offset = 0;

    while (true) {
      const page = await listChildren(projectId, parentPath, PAGE_SIZE, offset);
      found = page.items.find((item) => item.path === currentPath);
      if (found) {
        break;
      }

      offset += page.items.length;
      if (offset >= page.total) {
        return null;
      }
    }

    if (i === segments.length - 1) {
      return found;
    }

    if (found.type !== 'directory') {
      return null;
    }

    parentPath = found.path;
  }

  return null;
}
