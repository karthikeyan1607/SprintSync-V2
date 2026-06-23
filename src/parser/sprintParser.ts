/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SprintStory, ResourceCapacity, ParseResult, Resource, ParserLineType, ParsedLineDebug } from '../types';
import { resolveResource } from '../utils/resourceResolver';

// Standard set of known domains for quick initialization fallback
export const VALID_DOMAINS = [
  'CAT Rental',
  'Customer Master',
  'Asset Management',
  'CUOB',
  'Warranty',
  'DLMA',
  'ONE Site',
  'As Built BOM',
  'CAT Inspect',
  'Equipment History',
  'Efficiency Improvement Effort'
];

const KNOWN_ACTIVITIES = [
  'Automation',
  'Regression',
  'Validation',
  'Test Plan',
  'Defect Revalidation',
  'SIT Validation',
  'Integration',
  'Access Request',
  'Setup',
  'Design'
];

// Human person names heuristic check
export function isLikelyPersonName(name: string): boolean {
  const cleaned = name.trim();
  if (!cleaned) return false;

  if (cleaned.length < 2 || cleaned.length > 35) return false;

  // Person names only contain letters, spaces, hyphens, and periods
  if (!/^[A-Za-z\s\.-]+$/.test(cleaned)) return false;

  // Standard names start with a capital letter
  if (!/^[A-Z]/.test(cleaned)) return false;

  const lower = cleaned.toLowerCase();

  // Words that are highly emblematic of work items, domains, or sections
  const nonPersonKeywords = [
    'api', 'app', 'core', 'fix', 'fixes', 'merge', 'pr', 'pull', 'request', 'scope', 
    'enhancement', 'coverage', 'solution', 'secret', 'manager', 'client', 'utilization', 
    'rate', 'rates', 'validation', 'support', 'task', 'tasks', 'testing', 'automation', 
    'regression', 'workflow', 'calculator', 'overhaul', 'tracker', 'report', 'reports', 
    'generation', 'lookup', 'debug', 'access', 'setup', 'set up', 'feature', 'epic', 
    'sprint', 'velocity', 'capacity', 'dashboard', 'release', 'deployment', 'deploy', 
    'pipeline', 'service', 'database', 'db', 'config', 'migration', 'build', 'ci/cd', 
    'documentation', 'doc', 'docs', 'meeting', 'review', 'implementation', 'shift',
    'test', 'plan', 'planning', 'calibration', 'defect', 'sanity', 'ui', 'ux', 'contract',
    'work', 'job', 'bug', 'issue', 'ticket', 'project', 'module', 'system', 'process',
    'management', 'development', 'qa', 'uat', 'prod', 'dev', 'stage', 'environment',
    'infra', 'infrastructure', 'general', 'support', 'training', 'onboarding',
    'fluids', 'history', 'invoices', 'pal', 'dealer', 'hierarchy', 'scenarios', 'self',
    'healing', 'agent', 'analysis', 'additional', 'effort', 'improvement', 'as', 'built', 'bom',
    'export', 'exporting', 'end', 'point', 'points', 'alert', 'alerts', 'dependabot', 'address', 'add'
  ];

  for (const kw of nonPersonKeywords) {
    const rx = new RegExp('\\b' + kw + '\\b', 'i');
    if (rx.test(lower)) {
      return false;
    }
  }

  return true;
}

export function detectRegionFromText(text: string): string | null {
  const t = text.toUpperCase();
  if (/\bINDIA\b/i.test(t)) return 'India';
  if (/\b(?:USA?|UNITED STATES)\b/i.test(t)) return 'USA';
  if (/\bEMEA\b/i.test(t)) return 'EMEA';
  if (/\bAPAC\b/i.test(t)) return 'APAC';
  if (/\bEAST\s+EUROPE\b/i.test(t)) return 'East Europe';
  if (/\bGLOBAL\b/i.test(t)) return 'GLOBAL';
  return null;
}

export function isTitleTruncated(story: SprintStory): boolean {
  if (!story.rawLine) return false;
  
  let cleanLine = story.rawLine.trim();
  const resourceHeaderMatch = cleanLine.match(/^([A-Za-z\s\.-]+):\s*(.*)$/);
  if (resourceHeaderMatch) {
    const candidateName = resourceHeaderMatch[1].trim();
    if (isLikelyResourceName(candidateName)) {
      cleanLine = resourceHeaderMatch[2].trim();
    }
  }
  
  cleanLine = cleanLine.replace(/[\s-:]*(\d+(?:[.,]\d+)?)\s*(?:pts?|points?)\s*$/i, '');
  cleanLine = cleanLine.trim().replace(/[\s-:(]+$/, '');
  
  return story.title.trim().length + 2 < cleanLine.length;
}

export function isLikelyResourceName(name: string, csvResourceNames?: string[]): boolean {
  const cleaned = name.trim();
  if (!cleaned) return false;

  if (csvResourceNames && csvResourceNames.length > 0) {
    const lowerCleaned = cleaned.toLowerCase();
    for (const csvName of csvResourceNames) {
      if (!csvName) continue;
      const lowerCsv = csvName.toLowerCase();
      if (lowerCleaned === lowerCsv) {
        return true;
      }
      
      const words = lowerCleaned.split(/\s+/).filter(w => !!w);
      const csvWords = lowerCsv.split(/\s+/).filter(w => !!w);
      if (words.length <= 3 && words.length > 0) {
        if (words.every(w => csvWords.includes(w))) {
          return true;
        }
      }
    }
  }

  const wordsCount = cleaned.split(/\s+/).filter(w => !!w).length;
  if (wordsCount < 1 || wordsCount > 3) return false;

  return isLikelyPersonName(cleaned);
}

export interface UnifiedParseResult {
  stories: SprintStory[];
  capacities: ResourceCapacity[];
  domains: string[];
  resources: string[];
  unknownItems: Array<{
    id: string;
    lineText: string;
    reason: string;
    suggestedResource?: string;
    confidence: number;
    originalLine: string;
  }>;
  debugLines: ParsedLineDebug[];
}

/**
 * Standardizes line-by-line parsing utilizing state machine rules,
 * fuzzy mapping checks, and point normalization.
 */
export function runUnifiedParser(content: string, csvResourcesOrNames?: any[]): UnifiedParseResult {
  const lines = content.split(/\r?\n/);

  // Normalize list of resources to Resource structures
  let csvResources: Resource[] = [];
  let csvResourceNames: string[] = [];

  if (csvResourcesOrNames && csvResourcesOrNames.length > 0) {
    if (typeof csvResourcesOrNames[0] === 'string') {
      csvResourceNames = csvResourcesOrNames as string[];
      csvResources = csvResourceNames.map(name => ({
        displayName: name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@cat.com`,
        region: 'India' // Default region fallback
      }));
    } else {
      csvResources = csvResourcesOrNames as Resource[];
      csvResourceNames = csvResources.map(r => r.displayName);
    }
  } else {
    try {
      const saved = localStorage.getItem('sprintsync_resource_roster');
      if (saved) {
        csvResources = JSON.parse(saved);
        csvResourceNames = csvResources.map(r => r.displayName);
      }
    } catch (e) {
      // Ignored
    }
  }

  const stories: SprintStory[] = [];
  const capacities: ResourceCapacity[] = [];
  const foundDomains = new Set<string>();
  const foundResources = new Set<string>();
  const unknownItems: UnifiedParseResult['unknownItems'] = [];
  const debugLines: ParsedLineDebug[] = [];

  let currentDomain = 'CUOB'; // Default domain fallback (should have explicit domain matched otherwise)
  let currentResource = 'Unassigned';
  let inResourceSection = false;
  let explicitDomainHeaderParsed = false;

  // Ignore list: treat lines that are purely status notes as skipped
  const IGNORE_STATUS_REGEX = /^(done|in progress|pending|85% complete|80% complete|pr|meeting|review needed|blocked|waiting)$/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    let line = rawLine.trim();
    let detectedType: ParserLineType = 'IGNORE';
    let assignedDomain = currentDomain;
    let assignedResource = currentResource;
    let points = 0;

    if (!line) {
      debugLines.push({
        lineNumber: i + 1,
        originalLine: rawLine,
        detectedType: 'IGNORE',
        assignedDomain,
        assignedResource,
        assignedPoints: 0
      });
      continue;
    }

    const lineLower = line.toLowerCase();

    // 1. IGNORE checks
    const isStatus = IGNORE_STATUS_REGEX.test(lineLower) || IGNORE_STATUS_REGEX.test(line.replace(/[\[\]\(\)]/g, ''));
    const isUtilityHeader = /^(velocity|capacity)\s*:?$/i.test(line);

    if (isStatus || isUtilityHeader) {
      debugLines.push({
        lineNumber: i + 1,
        originalLine: rawLine,
        detectedType: 'IGNORE',
        assignedDomain,
        assignedResource,
        assignedPoints: 0
      });
      continue;
    }

    // 2. RESOURCE HEADER OR DOMAIN HEADER (Ended with ":") Rule
    // "Rule: Only lines ending with ":" are resource headers."
    if (line.endsWith(':')) {
      const candidateName = line.slice(0, -1).trim();
      
      // Is it a Valid Domain?
      const matchedDomain = VALID_DOMAINS.find(d => d.toLowerCase() === candidateName.toLowerCase());
      if (matchedDomain) {
        // Domain Header
        detectedType = 'DOMAIN_HEADER';
        currentDomain = matchedDomain;
        foundDomains.add(matchedDomain);
        currentResource = 'Unassigned';
        inResourceSection = false;
        explicitDomainHeaderParsed = true;

        debugLines.push({
          lineNumber: i + 1,
          originalLine: rawLine,
          detectedType,
          assignedDomain: currentDomain,
          assignedResource: currentResource,
          assignedPoints: 0
        });
        continue;
      } else {
        // Resource Header
        detectedType = 'RESOURCE_HEADER';
        currentResource = candidateName;
        foundResources.add(candidateName);
        inResourceSection = true;

        debugLines.push({
          lineNumber: i + 1,
          originalLine: rawLine,
          detectedType,
          assignedDomain: currentDomain,
          assignedResource: currentResource,
          assignedPoints: 0
        });
        continue;
      }
    }

    // 3. VELOCITY ENTRY (Capacity Row) Checks (e.g. Caleb - 5 pt)
    const capacityMatch = line.match(/^([A-Za-z0-0 .()'_-]+?)(?:\s*[:-]\s*|\s+)(\d+(?:\.\d+)?)\s*(?:pt|pts|points?)?$/i);
    if (capacityMatch) {
      const candidateName = capacityMatch[1].trim();
      const capacityVal = parseFloat(capacityMatch[2].replace(',', '.'));

      // If it's a known person name or is likely we parse it as capacity, but we ALSO update the active resource section!
      if (isLikelyResourceName(candidateName, csvResourceNames) || csvResourceNames.some(n => n.toLowerCase() === candidateName.toLowerCase())) {
        detectedType = 'VELOCITY_ENTRY';
        points = capacityVal;

        const existingIdx = capacities.findIndex(c => c.resourceName.toLowerCase() === candidateName.toLowerCase());
        if (existingIdx !== -1) {
          capacities[existingIdx].capacity = capacityVal;
        } else {
          capacities.push({ resourceName: candidateName, capacity: capacityVal });
        }
        foundResources.add(candidateName);

        // Update active resource header context
        currentResource = candidateName;
        inResourceSection = true;

        debugLines.push({
          lineNumber: i + 1,
          originalLine: rawLine,
          detectedType,
          assignedDomain: currentDomain,
          assignedResource: candidateName,
          assignedPoints: capacityVal
        });
        continue;
      }
    }

    // 4. If we are not currently in a resource section (e.g. catalog description or comments before any resource section), ignore.
    if (!inResourceSection || currentResource === 'Unassigned') {
      const isFeatureDeclaration = /\b(?:Feature|Epic|Bug|User\s*Story|Task)\b/i.test(line) || /^\d+$/i.test(line);
      detectedType = isFeatureDeclaration ? 'FEATURE_CATALOG_ENTRY' : 'IGNORE';

      debugLines.push({
        lineNumber: i + 1,
        originalLine: rawLine,
        detectedType,
        assignedDomain: currentDomain,
        assignedResource: 'Unassigned',
        assignedPoints: 0
      });
      continue;
    }

    // 5. Otherwise, parse as entry under active resource: ASSIGNED_STORY
    detectedType = 'ASSIGNED_STORY';

    // Rule: Extract points strictly from the end of the line
    const ptsMatch = line.match(/(\d+(?:\.\d+)?)\s*pt[s]?$/i);
    let storyPoints = 1.0;
    if (ptsMatch) {
      storyPoints = parseFloat(ptsMatch[1]);
    }
    points = storyPoints;

    // Preserve the full title without splitting on hyphens (-) or stripping anything other than the trailing point expression
    let storyTitle = line;
    if (ptsMatch) {
      // replace only the trailing points suffix
      storyTitle = line.replace(/[\s-]*(\d+(?:\.\d+)?)\s*pt[s]?$/i, '');
      storyTitle = storyTitle.trim().replace(/[\s-:(]+$/, '');
    }

    const activeAssignee = currentResource;
    if (activeAssignee.toLowerCase() !== 'unassigned') {
      foundResources.add(activeAssignee);
    }

    // Work item ID & type detection
    let workType: 'Feature' | 'Epic' | 'Task' | 'Bug' | 'User Story' = 'User Story';
    let featureId: string | undefined = undefined;

    // Extract ID and detect type cleanly
    const featureIdMatch = storyTitle.match(/\bFeature\s*#?:?\s*(\d+)/i);
    const epicIdMatch = storyTitle.match(/\bEpic\s*#?:?\s*(\d+)/i);
    const bugIdMatch = storyTitle.match(/\bBug\s*#?:?\s*(\d+)/i);
    const usIdMatch = storyTitle.match(/\bUser\s*Story\s*#?:?\s*(\d+)/i);

    if (featureIdMatch) {
      featureId = featureIdMatch[1];
      workType = 'Feature';
    } else if (epicIdMatch) {
      featureId = epicIdMatch[1];
      workType = 'Epic';
    } else if (bugIdMatch) {
      featureId = bugIdMatch[1];
      workType = 'Bug';
    } else if (usIdMatch) {
      featureId = usIdMatch[1];
      workType = 'User Story';
    } else {
      // Fallback matching
      const genericIdMatch = storyTitle.match(/^(\d+)\s*[:-]?\s*/);
      if (genericIdMatch) {
        featureId = genericIdMatch[1];
        workType = 'Feature';
      }
    }

    // Resolve resource profile details directly (exact case-insensitive match against roster)
    let email = '';
    const lowercaseAssignee = activeAssignee.toLowerCase();
    const matchedCsv = csvResources.find(r => r.displayName.toLowerCase() === lowercaseAssignee);
    if (matchedCsv) {
      email = matchedCsv.email;
    }

    // Check for activity keyword
    let activity = 'Implementation';
    const matchingAct = KNOWN_ACTIVITIES.find(act => 
      storyTitle.toLowerCase().includes(act.toLowerCase())
    );
    if (matchingAct) {
      activity = matchingAct;
    }

    stories.push({
      id: `STORY-${i}-${Math.floor(Math.random() * 10000)}`,
      domain: currentDomain,
      resourceName: activeAssignee,
      email,
      title: storyTitle,
      activity,
      points: storyPoints,
      featureId,
      workType,
      areaPath: `SprintSync\\${currentDomain}`,
      iterationPath: `SprintSync\\Iteration`,
      confidence: 100,
      parsingMethod: 'Deterministic Parse'
    });

    debugLines.push({
      lineNumber: i + 1,
      originalLine: rawLine,
      detectedType,
      assignedDomain: currentDomain,
      assignedResource: activeAssignee,
      assignedPoints: storyPoints
    });
  }

  // Ensure uniqueDomains only contains validated domains
  const uniqueDomains = Array.from(foundDomains);

  return {
    stories,
    capacities,
    domains: uniqueDomains,
    resources: Array.from(foundResources),
    unknownItems,
    debugLines
  };
}

/**
 * Validates parsed data and logs warnings
 */
export function validateParsedData(stories: SprintStory[], capacities: ResourceCapacity[]): string[] {
  const warnings: string[] = [];
  const seenTitles = new Set<string>();

  stories.forEach((story) => {
    if (!story.resourceName || story.resourceName === 'Unassigned') {
      warnings.push(`Warning: Story has no assigned resource: "${story.title}"`);
    }

    if (story.workType === 'Feature' && !story.featureId) {
      warnings.push(`Warning: Feature story lacks a numeric Feature ID: "${story.title}"`);
    }

    const titleKey = story.title.toLowerCase();
    if (seenTitles.has(titleKey)) {
      warnings.push(`Duplicate: Story with title "${story.title}" is duplicated in the backlog.`);
    } else {
      seenTitles.add(titleKey);
    }

    if (isTitleTruncated(story)) {
      warnings.push(`Warning: Title truncation detected for: "${story.title}"`);
    }
  });

  return warnings;
}

/**
 * Main parser coordinator entry point.
 */
export function parseSprintContent(content: string, csvResourcesOrNames?: any[]): ParseResult {
  const parsed = runUnifiedParser(content, csvResourcesOrNames);
  const warnings = validateParsedData(parsed.stories, parsed.capacities);

  console.log('=== SPRINTSYNC PARSER DEBUG SYSTEM ===');
  console.log(`Domains Found: ${parsed.domains.length}`);
  console.log(`Resources Found: ${parsed.resources.length}`);
  console.log(`Stories Found: ${parsed.stories.length}`);
  console.log(`Unknown Items: ${parsed.unknownItems.length}`);
  
  const featuresCount = parsed.stories.filter(s => s.workType === 'Feature').length;
  const epicsCount = parsed.stories.filter(s => s.workType === 'Epic').length;
  const bugsCount = parsed.stories.filter(s => s.workType === 'Bug').length;
  const userStoriesCount = parsed.stories.filter(s => s.workType === 'User Story').length;

  console.log(`Features Found: ${featuresCount}`);
  console.log(`Epics Found: ${epicsCount}`);
  console.log(`Bugs Found: ${bugsCount}`);
  console.log(`User Stories Found: ${userStoriesCount}`);
  console.log('======================================');

  return {
    stories: parsed.stories,
    capacities: parsed.capacities,
    domains: parsed.domains,
    resources: parsed.resources,
    warnings,
    debugLines: parsed.debugLines
  };
}
