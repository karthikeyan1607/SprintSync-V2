/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SprintStory {
  id: string; // Unique generated or parsed id
  domain: string;
  resourceName: string;
  featureId?: string;
  epicId?: string;
  title: string;
  activity: string;
  points: number;
  workType: 'Feature' | 'Epic' | 'Bug' | 'User Story' | 'Task';
  rawLine?: string;
  selected?: boolean;
  email?: string;
  areaPath?: string;
  iterationPath?: string;
  status?: 'Valid' | 'Warning' | 'Error';
  validationMessages?: string[];
  region?: string;
  confidence?: number;
  parsingMethod?: string;
}

export interface ResourceCapacity {
  resourceName: string;
  capacity: number;
}

export interface Resource {
  displayName: string;
  email: string;
  region?: string;
  capacity?: number;
  createdDate?: string;
}

export interface ResourceMatch {
  confluenceName: string;
  matchedDisplayName?: string;
  matchedEmail?: string;
  confidence: number;
  status: 'Mapped' | 'Review' | 'Unresolved';
}

export type ParserLineType =
  | 'PROGRAM_HEADER'
  | 'DOMAIN_HEADER'
  | 'VELOCITY_ENTRY'
  | 'RESOURCE_HEADER'
  | 'FEATURE_CATALOG_ENTRY'
  | 'ASSIGNED_STORY'
  | 'IGNORE';

export interface ParsedLineDebug {
  lineNumber: number;
  originalLine: string;
  detectedType: ParserLineType;
  assignedDomain: string;
  assignedResource: string;
  assignedPoints: number;
}

export interface ParseResult {
  stories: SprintStory[];
  capacities: ResourceCapacity[];
  domains: string[];
  resources: string[];
  warnings: string[];
  debugLines?: ParsedLineDebug[];
}

export interface SyncResultItem {
  id: string;
  title: string;
  featureId?: string;
  epicId?: string;
  assignedUser: string;
  email?: string;
  points: number;
  activity: string;
  areaPath?: string;
  iterationPath?: string;
  workType: 'Feature' | 'Epic' | 'Bug' | 'User Story' | 'Task';
  status: 'Published' | 'Failed' | 'Skipped';
  azureWorkItemId?: string;
  errorMessage?: string;
  resolution?: string;
  createdDate: string;
}

export interface SyncAuditHistory {
  id: string;
  sprintName: string;
  orgName: string;
  projectName: string;
  totalStories: number;
  createdCount: number;
  failedCount: number;
  skippedCount: number;
  durationSeconds: number;
  timestamp: string;
  stories: SyncResultItem[];
}

export interface AllocationHealthDetail {
  resourceName: string;
  allocated: number;
  expected: number;
  variance: number;
  status: 'Balanced' | 'Underallocated' | 'Overallocated';
}

export interface AllocationHealth {
  balancedCount: number;
  underallocatedCount: number;
  overallocatedCount: number;
  warningCount: number;
  detailedAllocations: AllocationHealthDetail[];
}
