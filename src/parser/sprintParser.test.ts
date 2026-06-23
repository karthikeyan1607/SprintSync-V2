/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { 
  runUnifiedParser, 
  isLikelyPersonName, 
  isLikelyResourceName, 
  parseSprintContent 
} from './sprintParser';

describe('Sprint Parser - Resource Detection & Correctness', () => {

  const sampleCsvResourceNames = [
    'Karthikeyan R',
    'Murali X',
    'Caleb Y',
    'Surya Prasad',
    'Sundhar Raj',
    'Evgeny',
    'Nick'
  ];

  describe('isLikelyPersonName & isLikelyResourceName heuristics', () => {
    it('should identify classic person names correctly', () => {
      expect(isLikelyPersonName('Caleb')).toBe(true);
      expect(isLikelyPersonName('Surya')).toBe(true);
      expect(isLikelyPersonName('Murali')).toBe(true);
      expect(isLikelyPersonName('Sundar')).toBe(true);
      expect(isLikelyPersonName('Karthikeyan')).toBe(true);
    });

    it('should reject non-person keywords', () => {
      expect(isLikelyPersonName('Testing')).toBe(false);
      expect(isLikelyPersonName('Automation')).toBe(false);
      expect(isLikelyPersonName('Regression')).toBe(false);
      expect(isLikelyPersonName('Setup')).toBe(false);
    });

    it('should match short forms or substrings matching the roster CSV (Rule 2)', () => {
      // "Caleb" matches "Caleb Y"
      expect(isLikelyResourceName('Caleb', sampleCsvResourceNames)).toBe(true);
      // "Surya" matches "Surya Prasad"
      expect(isLikelyResourceName('Surya', sampleCsvResourceNames)).toBe(true);
      // "Murali" matches "Murali X"
      expect(isLikelyResourceName('Murali', sampleCsvResourceNames)).toBe(true);
      // "Arkadii" is not in CSV but is standard person name
      expect(isLikelyResourceName('Arkadii', sampleCsvResourceNames)).toBe(true);
    });

    it('should enforce word count limit of 1-3 words (Rule 3)', () => {
      expect(isLikelyResourceName('Surya Sanity Regression Test Plan', sampleCsvResourceNames)).toBe(false);
    });
  });

  describe('Rule 1: Line ends with colon', () => {
    it('should detect colon-terminated names on separate lines', () => {
      const input = `CUOB
Caleb:
Feature 2447887 - Test Plan - 1pt
Feature 2638406 - Automation - 1pt`;

      const result = parseSprintContent(input, sampleCsvResourceNames);
      
      expect(result.resources).toContain('Caleb');
      expect(result.stories.length).toBe(2);
      expect(result.stories[0].resourceName).toBe('Caleb');
      expect(result.stories[0].title).toBe('Feature 2447887 - Test Plan');
      expect(result.stories[0].points).toBe(1);

      expect(result.stories[1].resourceName).toBe('Caleb');
      expect(result.stories[1].title).toBe('Feature 2638406 - Automation');
    });
  });

  describe('Single-line Resource & Story Prefix Parsing', () => {
    it('should parse Surya inline assignment with colon', () => {
      const input = `CUOB
Surya:
Sanity + Regression - 1 pt`;

      const result = parseSprintContent(input, sampleCsvResourceNames);
      expect(result.stories.length).toBe(1);
      
      const story = result.stories[0];
      expect(story.resourceName).toBe('Surya');
      expect(story.title).toBe('Sanity + Regression');
      expect(story.points).toBe(1);
    });

    it('should parse inline resource followed by story details', () => {
      const input = `CUOB
Caleb: Feature 2447887: SIT Validation - Test Plan - 1pt`;

      const result = parseSprintContent(input, sampleCsvResourceNames);
      expect(result.stories.length).toBe(1);

      const story = result.stories[0];
      expect(story.resourceName).toBe('Caleb');
      expect(story.featureId).toBe('2447887');
      // The Feature ID part and title details must be completely retained
      expect(story.title).toBe('Feature 2447887: SIT Validation - Test Plan');
      expect(story.activity).toBe('Validation'); // Matches "SIT Validation" from KNOWN_ACTIVITIES fallback
      expect(story.points).toBe(1);
    });
  });

  describe('Validation: Reject resource names as story titles', () => {
    it('should reject "Caleb - 5 pt" or "Murali - 3.5 pt" as stories, and instead parse them as capacities', () => {
      const input = `CUOB
Caleb - 5 pt
Murali - 3.5 pt`;

      const result = parseSprintContent(input, sampleCsvResourceNames);
      
      // Should have NO stories
      expect(result.stories.length).toBe(0);
      
      // Should have parsed capacities correctly
      expect(result.capacities).toContainEqual({ resourceName: 'Caleb', capacity: 5 });
      expect(result.capacities).toContainEqual({ resourceName: 'Murali', capacity: 3.5 });
    });

    it('should reject general resource names as story titles during flow to avoid misclassification', () => {
      const input = `CUOB
Caleb:
Caleb - 1 pt`; // Mistaken repeat or misaligned capacity line

      const result = parseSprintContent(input, sampleCsvResourceNames);
      expect(result.stories.length).toBe(0);
      expect(result.capacities).toContainEqual({ resourceName: 'Caleb', capacity: 1 });
    });
  });

  describe('Context-aware Resource State Inheritance', () => {
    it('should automatically carry over active resource domain states until changed', () => {
      const input = `CUOB
Caleb:
Feature 2447887 - Calibration - 1.5 pt
Feature 2638406 - Database - 2 pt
Surya:
Feature 2841440 - Regression - 1 pt`;

      const result = parseSprintContent(input, sampleCsvResourceNames);
      expect(result.stories.length).toBe(3);

      expect(result.stories[0].resourceName).toBe('Caleb');
      expect(result.stories[1].resourceName).toBe('Caleb');
      expect(result.stories[2].resourceName).toBe('Surya');
    });
  });

  describe('Confluence Sprint Format Redesign - Exact Checklist Tests', () => {
    it('should detect specified domains (STEP 1)', () => {
      const input = `CAT Rental
Equipment History
Efficiency Improvement Effort`;
      const result = parseSprintContent(input, sampleCsvResourceNames);
      expect(result.domains).toContain('CAT Rental');
      expect(result.domains).toContain('Equipment History');
      expect(result.domains).toContain('Efficiency Improvement Effort');
    });

    it('should support capacity format variants A, B, C, and D (STEP 2)', () => {
      const input = `CUOB
Nick: 5 pt
Murali - 3.5 pt
Caleb 2 pt
Karthikeyan: 4 pt`;
      const result = parseSprintContent(input, [
        'Nick', 'Murali', 'Caleb', 'Karthikeyan'
      ]);

      expect(result.capacities).toContainEqual({ resourceName: 'Nick', capacity: 5 });
      expect(result.capacities).toContainEqual({ resourceName: 'Murali', capacity: 3.5 });
      expect(result.capacities).toContainEqual({ resourceName: 'Caleb', capacity: 2 });
      expect(result.capacities).toContainEqual({ resourceName: 'Karthikeyan', capacity: 4 });
    });

    it('should track resource block sections on standard and separate colon entries (STEP 3)', () => {
      const input = `CUOB
Sam:
Feature 2527641 - Export End Point - 2 pt
Murali:
CAT Rental E2E - Defect Revalidation - 1pt`;
      const result = parseSprintContent(input, ['Sam', 'Murali']);
      
      expect(result.resources).toContain('Sam');
      expect(result.resources).toContain('Murali');
      expect(result.stories.length).toBe(2);
      
      expect(result.stories[0].resourceName).toBe('Sam');
      expect(result.stories[1].resourceName).toBe('Murali');
    });

    it('should perform feature ID and epic ID and point extraction cleanly (STEPS 4, 5, 6, 7)', () => {
      const input = `CUOB
Sam:
Feature 2527641: Contracts Service - 2 pt
Epic 1390814: Core Config Upgrade - 1.5 pt`;
      const result = parseSprintContent(input, ['Sam']);

      expect(result.stories.length).toBe(2);
      expect(result.stories[0].featureId).toBe('2527641');
      expect(result.stories[0].workType).toBe('Feature');
      expect(result.stories[0].points).toBe(2);

      expect(result.stories[1].epicId).toBe('1390814');
      expect(result.stories[1].workType).toBe('Epic');
      expect(result.stories[1].points).toBe(1.5);
    });

    it('should NEVER parse story titles as system resources, maintaining accurate negative bounds', () => {
      const input = `CUOB
Sam:
Integration Core Fixes and PR merge - 1pt
Additional scope and enhancements to solution coverage - 1.5 pt
Secret Manager set up for DLMA client - 1 pt
Utilization Rate API - 1.5 pt
Inspection Service - 2 pt
Fluids History Service - 2 pt
Invoices API - 1 pt
PAL Service - 1 pt
Dealer Hierarchy scenarios - 1.5 pt
Self Healing - 1 pt
Agent Setup for log Analysis - 1 pt`;
      const result = parseSprintContent(input, ['Sam']);

      // None of the story titles should end up as a resource name
      expect(result.resources).not.toContain('Integration Core Fixes and PR merge');
      expect(result.resources).not.toContain('Secret Manager set up for DLMA client');
      expect(result.resources).not.toContain('Invoices API');
      expect(result.resources).not.toContain('Self Healing');

      // They should all be parsed as 11 distinct stories belonging to Sam
      expect(result.stories.length).toBe(11);
      expect(result.stories.every(s => s.resourceName === 'Sam')).toBe(true);
    });

    it('should not parse feature declarations appearing before resource sections as stories (Stage 3 Catalog Entry Constraint)', () => {
      const input = `CUOB
Feature 12345: Standard Feature Title - 2 pt
Sam:
Feature 2527641: Contracts Service - 2 pt`;
      const result = parseSprintContent(input, ['Sam']);
      expect(result.stories.length).toBe(1);
      expect(result.stories[0].featureId).toBe('2527641');
      expect(result.stories[0].resourceName).toBe('Sam');
    });

    it('should not treat resource names or velocity rows as domains (Stage 1 Strict Domain Constraint)', () => {
      const input = `Karthikeyan - 4.5
CUOB
Murali - 5`;
      const result = parseSprintContent(input, ['Karthikeyan', 'Murali']);
      // Domains list should only contain actual validated domain: CUOB
      expect(result.domains).toEqual(['CUOB']);
      expect(result.capacities).toContainEqual({ resourceName: 'Karthikeyan', capacity: 4.5 });
      expect(result.capacities).toContainEqual({ resourceName: 'Murali', capacity: 5 });
    });

    it('should correctly parse stories with multiple hyphens and preserve full title and trailing point format (Requirement 6)', () => {
      const input = `CUOB
Karthikeyan:
UI - E2E - Automation for Unified View - Customers (11.2) - 2pts
Backend - Automation for Unified View (11.2) - 2pts
Feature 2447887: SIT Validation - DO11.3 - E2E - Unified View for Customers, Assets, Users - Access Management Redesign - Connect With Aura and setup data / scripts - 2 pt`;

      const result = parseSprintContent(input, ['Karthikeyan']);
      expect(result.stories.length).toBe(3);

      // Story 1: UI - E2E - Automation for Unified View - Customers (11.2)
      expect(result.stories[0].title).toBe('UI - E2E - Automation for Unified View - Customers (11.2)');
      expect(result.stories[0].points).toBe(2);

      // Story 2: Backend - Automation for Unified View (11.2)
      expect(result.stories[1].title).toBe('Backend - Automation for Unified View (11.2)');
      expect(result.stories[1].points).toBe(2);

      // Story 3: Feature 2447887: SIT Validation - DO11.3 - E2E - Unified View for Customers...
      expect(result.stories[2].title).toBe('Feature 2447887: SIT Validation - DO11.3 - E2E - Unified View for Customers, Assets, Users - Access Management Redesign - Connect With Aura and setup data / scripts');
      expect(result.stories[2].points).toBe(2);
    });
  });

});
