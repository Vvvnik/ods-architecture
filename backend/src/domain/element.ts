export const ELEMENT_STATUSES = [
  'auto_found',
  'needed',
  'not_needed',
  'found',
  'unused',
] as const;

export type ElementStatus = (typeof ELEMENT_STATUSES)[number];

export const ELEMENT_TYPES = ['file', 'directory'] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export interface ElementDocument {
  id: string;
  project_id: string;
  path: string;
  parent_path: string;
  type: ElementType;
  status: ElementStatus;
  is_active: boolean;
  status_manually_set: boolean;
}

export interface ElementPublic {
  id: string;
  project_id: string;
  path: string;
  parent_path: string | null;
  type: ElementType;
  status: ElementStatus;
  is_active: boolean;
}

export interface ChildrenPage {
  items: ElementPublic[];
  total: number;
  limit: number;
  offset: number;
}

export function toElementPublic(doc: ElementDocument): ElementPublic {
  return {
    id: doc.id,
    project_id: doc.project_id,
    path: doc.path,
    parent_path: doc.parent_path === '' ? null : doc.parent_path,
    type: doc.type,
    status: doc.status,
    is_active: doc.is_active,
  };
}
