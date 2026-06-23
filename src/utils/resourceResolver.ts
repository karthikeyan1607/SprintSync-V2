/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Fuse from 'fuse.js';
import { Resource, ResourceMatch, SprintStory, AllocationHealth, ResourceCapacity } from '../types';

const LOCAL_STORAGE_KEY = 'sprintsync_approved_mappings';

/**
 * Parses raw CSV content to extract Resource definitions.
 * Format: DisplayName,Email
 */
export function parseResourceCsv(csv: string): Resource[] {
  if (!csv) return [];
  const lines = csv.split('\n').map(line => line.trim());
  const resources: Resource[] = [];

  for (const line of lines) {
    if (!line || line.toLowerCase().startsWith('displayname')) {
      continue; // Skip header
    }

    // Split by comma, handling potential quotes
    const parts = line.split(',').map(part => {
      // Remove surrounding quotes if present
      let cleaned = part.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
      }
      return cleaned;
    });

    if (parts.length >= 2) {
      const displayName = parts[0];
      // Clean email links if wrapped in markdown like [mailto:...] or markdown [email](mailto:email)
      let email = parts[1];
      const mailtoMatch = email.match(/\[?([^\]]+)\]?\(mailto:[^\)]+\)/i);
      if (mailtoMatch) {
        email = mailtoMatch[1];
      } else if (email.startsWith('[') && email.endsWith(')')) {
        // e.g. [karthikeyan.r@cat.com](mailto:...)
        const inner = email.split(']')[0].replace('[', '');
        email = inner;
      }

      // Read optional Region
      const region = parts[2] ? parts[2].trim() : undefined;

      resources.push({
        displayName,
        email: email.trim(),
        region
      });
    }
  }

  return resources;
}

/**
 * Loads approved mappings saved in localStorage.
 */
export function loadSavedMappings(): Record<string, Resource> {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Error loading saved mappings:', e);
    return {};
  }
}

/**
 * Saves a resource mapping to local learning profile storage.
 */
export function saveMapping(confluenceName: string, resource: Resource): void {
  try {
    const current = loadSavedMappings();
    current[confluenceName.toLowerCase()] = resource;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Error saving mapping to localStorage:', e);
  }
}

/**
 * Calculates match confidence level based on input type and patterns.
 */
export function calculateConfidence(confluenceName: string, csvResource: Resource): number {
  const confLower = confluenceName.toLowerCase().trim();
  const resLower = csvResource.displayName.toLowerCase().trim();

  // 1. Exact Match
  if (confLower === resLower) {
    return 100;
  }

  // 2. Partial Match (e.g. Confluence "Karthikeyan", CSV "Karthikeyan R")
  if (resLower.startsWith(confLower) || resLower.endsWith(confLower) || resLower.includes(confLower)) {
    return 95;
  }

  // 3. Fallback: simple text similarity (Length and substring ratios)
  return 0; // Handled primarily by Fuse.js
}

/**
 * Resolves a single confluence resource name.
 */
export function resolveResource(
  confluenceName: string,
  csvResources: Resource[],
  savedMappings: Record<string, Resource>
): ResourceMatch {
  const normName = confluenceName.toLowerCase().trim();

  // If unassigned or empty
  if (!normName || normName === 'unassigned') {
    return {
      confluenceName,
      confidence: 100,
      status: 'Mapped',
      matchedDisplayName: 'Unassigned',
      matchedEmail: ''
    };
  }

  // Priority 1: Previously Saved Mapping (Alias Match)
  if (savedMappings[normName]) {
    const saved = savedMappings[normName];
    const exists = csvResources.find(r => r.email.toLowerCase() === saved.email.toLowerCase());
    if (exists) {
      return {
        confluenceName,
        matchedDisplayName: exists.displayName,
        matchedEmail: exists.email,
        confidence: 92, // Alias Match
        status: 'Mapped'
      };
    }
  }

  if (csvResources.length === 0) {
    return {
      confluenceName,
      confidence: 0,
      status: 'Unresolved'
    };
  }

  // Priority 2: Exact Match check
  const exactMatch = csvResources.find(
    r => r.displayName.toLowerCase().trim() === normName
  );
  if (exactMatch) {
    return {
      confluenceName,
      matchedDisplayName: exactMatch.displayName,
      matchedEmail: exactMatch.email,
      confidence: 100, // Exact Match
      status: 'Mapped'
    };
  }

  // Priority 3: Partial Match check
  const partialMatch = csvResources.find(
    r => {
      const dispLower = r.displayName.toLowerCase().trim();
      const words = dispLower.split(/\s+/).filter(w => !!w);
      return dispLower.startsWith(normName) || dispLower.endsWith(normName) || words.includes(normName);
    }
  );
  if (partialMatch) {
    return {
      confluenceName,
      matchedDisplayName: partialMatch.displayName,
      matchedEmail: partialMatch.email,
      confidence: 90, // Alias / Pattern Match
      status: 'Mapped'
    };
  }

  // Priority 4: Fuzzy Match (Fuse.js)
  const fuse = new Fuse(csvResources, {
    keys: ['displayName'],
    includeScore: true,
    threshold: 0.5 // Search threshold
  });

  const results = fuse.search(confluenceName);

  if (results.length > 0) {
    const bestResult = results[0];
    const score = bestResult.score ?? 1;
    const calculatedConfidence = Math.round((1 - score) * 100);

    // Confidence ranges
    if (calculatedConfidence >= 85) {
      return {
        confluenceName,
        matchedDisplayName: bestResult.item.displayName,
        matchedEmail: bestResult.item.email,
        confidence: calculatedConfidence, // Fuzzy Match
        status: 'Mapped'
      };
    } else {
      return {
        confluenceName,
        matchedDisplayName: bestResult.item.displayName,
        matchedEmail: bestResult.item.email,
        confidence: calculatedConfidence,
        status: 'Unresolved' // below 85% is Unknown Item
      };
    }
  }

  // Priority 5: Unresolved
  return {
    confluenceName,
    confidence: 0,
    status: 'Unresolved'
  };
}

/**
 * Resolves all resources given a flat list of names extracted from Confluence.
 */
export function resolveAllResources(
  confluenceNames: string[],
  csvResources: Resource[]
): ResourceMatch[] {
  const saved = loadSavedMappings();
  return confluenceNames.map(name => resolveResource(name, csvResources, saved));
}

/**
 * Checks if there are any remaining unresolved mapped structures.
 */
export function getUnresolvedResources(matches: ResourceMatch[]): ResourceMatch[] {
  return matches.filter(match => match.status === 'Unresolved');
}

/**
 * Resolves a story's resourceName to its associated CSV resource profile.
 */
export function getMatchedCsvResource(
  resourceName: string,
  csvResources: Resource[]
): Resource | undefined {
  if (!resourceName || resourceName.toLowerCase() === 'unassigned') {
    return undefined;
  }

  // 1. Check direct fit by display name
  const exactMatch = csvResources.find(
    r => r.displayName.toLowerCase().trim() === resourceName.toLowerCase().trim()
  );
  if (exactMatch) {
    return exactMatch;
  }

  // 2. Look up within the saved mappings (fallback to learning profiles)
  const savedMappings = loadSavedMappings();
  const matchedSaved = savedMappings[resourceName.toLowerCase().trim()];
  if (matchedSaved) {
    const csvMatch = csvResources.find(
      r => r.email.toLowerCase() === matchedSaved.email?.toLowerCase() ||
           r.displayName.toLowerCase() === matchedSaved.displayName?.toLowerCase()
    );
    if (csvMatch) {
      return csvMatch;
    }
  }

  // 3. Pattern matching check (e.g. "Karthikeyan" -> "Karthikeyan R")
  const normName = resourceName.toLowerCase().trim();
  const partialMatch = csvResources.find(r => {
    const dName = r.displayName.toLowerCase().trim();
    return dName.startsWith(normName) || dName.endsWith(normName) || dName.includes(normName);
  });
  if (partialMatch) {
    return partialMatch;
  }

  return undefined;
}

/**
 * Determines whether a resource name from Confluence/Backlog (or manual)
 * resolves to a CSV resource that belongs to the given manager's region.
 */
export function isResourceInRegion(
  resourceName: string,
  region: string,
  csvResources: Resource[]
): boolean {
  if (region.toLowerCase() === 'all') {
    return true;
  }

  if (!resourceName || resourceName.toLowerCase() === 'unassigned') {
    return true; // Keep unassigned items for local visibility so managers can manage/assign them
  }

  const matched = getMatchedCsvResource(resourceName, csvResources);
  if (matched) {
    return (matched.region || '').toLowerCase() === region.toLowerCase();
  }

  return false;
}

/**
 * Calculates allocation health as a single source of truth.
 */
export function calculateAllocationHealth(
  stories: SprintStory[],
  csvResources: Resource[],
  managerRegion: string,
  capacities: ResourceCapacity[] = []
): AllocationHealth {
  const allocations: Record<string, number> = {};

  // Sum points per worker based on resolved CSV resource's display name
  const regionalStories = stories.filter(story =>
    isResourceInRegion(story.resourceName, managerRegion, csvResources)
  );

  regionalStories.forEach(story => {
    const name = story.resourceName ? story.resourceName.trim() : '';
    if (name && name.toLowerCase() !== 'unassigned') {
      const matched = getMatchedCsvResource(name, csvResources);
      const targetName = matched ? matched.displayName : name;
      allocations[targetName] = (allocations[targetName] || 0) + story.points;
    }
  });

  // Get all resource profiles of the current manager's region
  const regionalMembers = (managerRegion || 'ALL').toUpperCase() === 'ALL'
    ? csvResources
    : csvResources.filter(r => (r.region || '').toLowerCase() === managerRegion.toLowerCase());

  let balancedCount = 0;
  let underallocatedCount = 0;
  let overallocatedCount = 0;

  const detailedAllocations = regionalMembers.map(member => {
    // Round allocation to avoid floating-point issues (e.g., 5.0)
    const allocated = Number((allocations[member.displayName] || 0).toFixed(2));
    
    // Look up in parsed capacities or match
    const matchedCap = capacities.find(
      c => c.resourceName.toLowerCase().trim() === member.displayName.toLowerCase().trim() ||
           member.displayName.toLowerCase().trim().includes(c.resourceName.toLowerCase().trim()) ||
           c.resourceName.toLowerCase().trim().includes(member.displayName.toLowerCase().trim())
    );
    const expected = matchedCap ? matchedCap.capacity : 5;
    const variance = Number((allocated - expected).toFixed(2));

    let status: 'Balanced' | 'Underallocated' | 'Overallocated' = 'Balanced';
    if (allocated < expected) {
      status = 'Underallocated';
      underallocatedCount++;
    } else if (allocated > expected) {
      status = 'Overallocated';
      overallocatedCount++;
    } else {
      balancedCount++;
    }

    return {
      resourceName: member.displayName,
      allocated,
      expected,
      variance,
      status,
    };
  });

  const warningCount = underallocatedCount + overallocatedCount;

  // Debug logging exactly as requested (Total Resources, Balanced, Underallocated, Overallocated)
  console.log('--- ALLOCATION HEALTH CHECK DEBUG LOG ---');
  console.log(`Total Resources: ${regionalMembers.length}`);
  console.log(`Balanced: ${balancedCount}`);
  console.log(`Underallocated: ${underallocatedCount}`);
  console.log(`Overallocated: ${overallocatedCount}`);
  console.log(`Warning Count: ${warningCount}`);
  console.log(`Verification: ${balancedCount + underallocatedCount + overallocatedCount === regionalMembers.length}`);
  console.log('-----------------------------------------');

  return {
    balancedCount,
    underallocatedCount,
    overallocatedCount,
    warningCount,
    detailedAllocations,
  };
}
