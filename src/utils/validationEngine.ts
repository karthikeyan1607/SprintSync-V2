/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SprintStory, ResourceCapacity, ResourceMatch } from '../types';

export function validateSprintStory(
  story: SprintStory,
  allStories: SprintStory[]
): { status: 'Valid' | 'Warning' | 'Error'; validationMessages: string[] } {
  const messages: string[] = [];
  let status: 'Valid' | 'Warning' | 'Error' = 'Valid';

  // 1. Missing Resource
  if (!story.resourceName || story.resourceName.trim() === '' || story.resourceName.toLowerCase() === 'unassigned') {
    messages.push('Missing Resource: This story has no assigned engineer.');
    status = 'Error';
  }

  // 2. Missing LDAP Email
  if (!story.email || !story.email.trim() || story.email.toLowerCase() === 'unassigned') {
    messages.push('Missing LDAP Email: No email is associated with this resource.');
    status = 'Warning';
  }

  // 3. Missing Title
  if (!story.title || !story.title.trim()) {
    messages.push('Missing Title: Story title cannot be empty.');
    status = 'Error';
  }

  // 4. Missing Iteration Path
  if (!story.iterationPath || !story.iterationPath.trim()) {
    messages.push('Missing Iteration Path: Azure DevOps Iteration Path is required.');
    status = 'Error';
  }

  // 5. Missing Area Path
  if (!story.areaPath || !story.areaPath.trim()) {
    messages.push('Missing Area Path: Azure DevOps Area Path is required.');
    status = 'Error';
  }

  // 6. Invalid Points
  if (story.points === undefined || story.points === null || isNaN(story.points) || story.points <= 0) {
    messages.push(`Invalid Points: Estimated size (${story.points ?? 'none'}) must be greater than 0.`);
    status = 'Error';
  }

  // 7. Invalid Feature ID Format (must be digits only)
  if (story.featureId && !/^\d+$/.test(story.featureId.toString().trim())) {
    messages.push(`Invalid Feature Format: Feature ID "${story.featureId}" must be numeric.`);
    status = 'Error';
  }

  // 8. Duplicate Stories
  const duplicates = allStories.filter(
    (s) =>
      s.id !== story.id &&
      s.title?.trim().toLowerCase() === story.title?.trim().toLowerCase() &&
      s.resourceName?.trim().toLowerCase() === story.resourceName?.trim().toLowerCase()
  );
  if (duplicates.length > 0) {
    messages.push('Duplicate Story: An identical story title is already assigned to this resource.');
    // Error overrides Warning, so only set to Warning if it's currently Valid
    if (status === 'Valid') {
      status = 'Warning';
    }
  }

  return {
    status,
    validationMessages: messages,
  };
}
