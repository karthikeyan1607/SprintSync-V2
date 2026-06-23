/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { ResourceCapacity, SprintStory } from '../types';

interface CapacityWarningsProps {
  capacities: ResourceCapacity[];
  stories: SprintStory[];
}

export default function CapacityWarnings({ capacities, stories }: CapacityWarningsProps) {
  // Compute allocated points per resource
  const resourceAllocations: Record<string, number> = {};
  stories.forEach((story) => {
    const name = story.resourceName.toLowerCase();
    if (name !== 'unassigned') {
      resourceAllocations[name] = (resourceAllocations[name] || 0) + story.points;
    }
  });

  // Find count of overallocated resources
  const overallocatedCount = capacities.filter((cap) => {
    const allocated = resourceAllocations[cap.resourceName.toLowerCase()] || 0;
    return allocated > cap.capacity;
  }).length;

  if (overallocatedCount === 0) return null;

  return (
    <div 
      id="capacity-warning-banner"
      className="bg-red-50 border border-red-200 text-red-900 p-5 rounded-2xl flex items-start space-x-4 shadow-[0_4px_16px_rgba(239,68,68,0.04)] animate-pulse"
    >
      <div className="bg-red-600 p-2.5 rounded-xl text-white">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
      </div>
      <div className="space-y-1">
        <h4 className="font-bold uppercase tracking-wider text-red-800 text-xs flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1.5 text-red-600" />
          Resource Overallocation Threat Detected
        </h4>
        <p className="text-xs text-red-700 leading-relaxed font-semibold">
          {overallocatedCount} {overallocatedCount === 1 ? 'Resource is' : 'Resources are'} overallocated. 
          Review sprint planning and rebalance story allocations before creating stories in Azure DevOps.
        </p>
      </div>
    </div>
  );
}
