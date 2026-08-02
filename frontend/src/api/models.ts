import type { components } from './types.js';

export type Project = components['schemas']['Project'];
export type RegisterProjectRequest = components['schemas']['RegisterProjectRequest'];
export type Element = components['schemas']['Element'];
export type ElementStatus = components['schemas']['ElementStatus'];
export type ChildrenPage = components['schemas']['ChildrenPage'];
export type FileContent = components['schemas']['FileContent'];
export type ApiErrorBody = components['schemas']['ApiError'];
export type SourceType = Project['source_type'];
export type SyncStatus = Project['sync_status'];

export const ELEMENT_STATUSES: ElementStatus[] = [
  'auto_found',
  'needed',
  'not_needed',
];
