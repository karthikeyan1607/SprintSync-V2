/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { ResourceCapacity, SprintStory } from '../types';

interface CapacitySummaryProps {
  capacities: ResourceCapacity[];
  stories: SprintStory[];
}

export default function CapacitySummary({ capacities, stories }: CapacitySummaryProps) {
  // Aggregate story points per resource
  const resourceAllocations: Record<string, number> = {};
  stories.forEach((story) => {
    const name = story.resourceName.toLowerCase();
    if (name !== 'unassigned') {
      resourceAllocations[name] = (resourceAllocations[name] || 0) + story.points;
    }
  });

  // Calculate stats
  let totalCapacity = 0;
  let totalAllocated = 0;
  let overallocatedCount = 0;
  let balancedCount = 0;
  let underallocatedCount = 0;
  let highestAllocation = { name: 'None', points: 0 };

  capacities.forEach((cap) => {
    totalCapacity += cap.capacity;
    const allocated = resourceAllocations[cap.resourceName.toLowerCase()] || 0;
    totalAllocated += allocated;

    if (allocated > cap.capacity) {
      overallocatedCount++;
    } else if (allocated === cap.capacity) {
      balancedCount++;
    } else {
      underallocatedCount++;
    }

    if (allocated > highestAllocation.points) {
      highestAllocation = { name: cap.resourceName, points: allocated };
    }
  });

  const averageLoadPercent = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

  // Recommendations logic
  const recommendations: string[] = [];
  if (overallocatedCount > 0) {
    recommendations.push(
      `Reallocate tasks from ${overallocatedCount} overallocated team member(s) to underallocated resources.`
    );
  }
  if (underallocatedCount > 0 && overallocatedCount === 0) {
    recommendations.push(
      `Consider pulling in higher priority backlog tickets to absorb remaining ${Number(
        (totalCapacity - totalAllocated).toFixed(1)
      )} story points of capacity.`
    );
  }
  if (balancedCount > 0 && overallocatedCount === 0 && underallocatedCount === 0) {
    recommendations.push(
      'Sprint matches perfect velocity alignment! Scope and resources are fully optimized.'
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('Maintain active velocity checks as additional requirements emerge.');
  }

  return (
    <div 
      id="capacity-summary-bento"
      className="bg-white border border-zinc-200 rounded-2xl shadow-[0_4px_18px_-4px_rgba(0,0,0,0.03)] p-6 font-sans space-y-6"
    >
      <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-zinc-900 text-xs uppercase tracking-wider flex items-center">
            <Sparkles className="w-4 h-4 mr-1.5 text-[#FFCD11] stroke-[2.5]" />
            Sprint Smart Diagnostics
          </h3>
          <p className="text-[10px] text-zinc-400 font-semibold uppercase mt-0.5">Automated Velocity Insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1: Average Capacity Load */}
        <div className="space-y-2 bg-zinc-50 p-4 border border-zinc-100 rounded-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-zinc-700" />
            Average Allocation Load
          </span>
          <div className="flex items-baseline space-x-1">
            <span className={`text-2xl font-black ${averageLoadPercent > 100 ? 'text-red-650' : averageLoadPercent >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {averageLoadPercent.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold">of Total Pool</span>
          </div>
          <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${averageLoadPercent > 100 ? 'bg-red-500' : 'bg-[#FFCD11]'}`}
              style={{ width: `${Math.min(averageLoadPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Highest Assigned Member */}
        <div className="space-y-2 bg-zinc-50 p-4 border border-zinc-100 rounded-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-zinc-700" />
            Highest Individual Load
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-black text-zinc-800 truncate" title={highestAllocation.name}>
              {highestAllocation.name}
            </span>
            <span className="text-xs font-semibold text-zinc-500 mt-0.5">
              Assigned Points: <b className="text-zinc-900">{highestAllocation.points.toFixed(1)} pt</b>
            </span>
          </div>
        </div>

        {/* Metric 3: Optimization Recommendations */}
        <div className="space-y-1.5 bg-zinc-50 p-4 border border-zinc-100 rounded-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center">
            <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-zinc-700" />
            Smart Action Step
          </span>
          <p className="text-xs font-semibold text-zinc-650 leading-relaxed">
            {recommendations[0]}
          </p>
        </div>
      </div>
    </div>
  );
}
