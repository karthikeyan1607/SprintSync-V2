/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Users, Gauge, Globe, FileText } from 'lucide-react';
import { ResourceCapacity, SprintStory } from '../types';

interface CapacityCardsProps {
  capacities: ResourceCapacity[];
  stories: SprintStory[];
  managerRegion?: string;
}

export default function CapacityCards({ capacities, stories, managerRegion = 'India' }: CapacityCardsProps) {
  // 1. Count unique resources actually mapped in selected region
  const uniqueResourcesCount = capacities.length;

  // 2. Total Capacity of region in points
  const totalCapacity = capacities.reduce((sum, c) => sum + c.capacity, 0);

  // 3. Allocated Points
  const totalAllocated = stories.reduce((sum, s) => sum + s.points, 0);

  // 4. Remaining Points
  const remainingPoints = Number((totalCapacity - totalAllocated).toFixed(2));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
      {/* CARD 1: Region */}
      <div 
        id="card-region"
        className="bg-white p-6 border-l-4 border-blue-500 border-y border-r border-zinc-200/80 rounded-2xl shadow-[0_4px_18px_-4px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:shadow-[0_8px_25px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 duration-200"
      >
        <div className="space-y-1.5 font-sans">
          <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest block">
            Region
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-black text-zinc-900 leading-none uppercase">
              {managerRegion}
            </span>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-3 text-blue-600 rounded-xl">
          <Globe className="w-6 h-6 stroke-[2]" />
        </div>
      </div>

      {/* CARD 2: Resources */}
      <div 
        id="card-resources"
        className="bg-white p-6 border-l-4 border-[#FFCD11] border-y border-r border-[#FFCD11]/20 rounded-2xl shadow-[0_4px_18px_-4px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:shadow-[0_8px_25px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 duration-200"
      >
        <div className="space-y-1.5 font-sans">
          <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest block">
            Resources
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-black text-zinc-900 leading-none">
              {uniqueResourcesCount}
            </span>
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Engineers</span>
          </div>
        </div>
        <div className="bg-zinc-50 border border-zinc-150 p-3 text-zinc-800 rounded-xl">
          <Users className="w-6 h-6 stroke-[2]" />
        </div>
      </div>

      {/* CARD 3: Stories */}
      <div 
        id="card-stories"
        className="bg-white p-6 border-l-4 border-emerald-500 border-y border-r border-[#E2F9EE]/40 rounded-2xl shadow-[0_4px_18px_-4px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:shadow-[0_8px_25px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 duration-200"
      >
        <div className="space-y-1.5 font-sans">
          <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest block">
            Stories
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-black text-emerald-600 leading-none">
              {stories.length}
            </span>
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Entries</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold block bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100/55 w-fit">
            {totalAllocated.toFixed(1)} pt Allocated
          </span>
        </div>
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100">
          <FileText className="w-6 h-6 stroke-[2]" />
        </div>
      </div>

      {/* CARD 4: Capacity */}
      <div 
        id="card-capacity"
        className={`bg-white p-6 border-l-4 ${remainingPoints < 0 ? 'border-red-500' : 'border-zinc-900'} border-y border-r border-zinc-200/80 rounded-2xl shadow-[0_4px_18px_-4px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:shadow-[0_8px_25px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 duration-200`}
      >
        <div className="space-y-1.5 font-sans">
          <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest block">
            Capacity
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-black text-zinc-900 leading-none">
              {totalCapacity.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">pt Max</span>
          </div>
          <span className={`text-[10px] font-extrabold block px-2 py-0.5 rounded border leading-snug w-fit ${
            remainingPoints < 0 
              ? 'bg-red-55 text-red-600 border-red-100' 
              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
          }`}>
            {remainingPoints >= 0 ? `${remainingPoints} pt Free` : `${Math.abs(remainingPoints)} pt Over`}
          </span>
        </div>
        <div className={`p-3 rounded-xl border ${
          remainingPoints < 0 ? 'bg-red-50 text-red-100' : 'bg-zinc-50 text-zinc-800'
        }`}>
          <Gauge className="w-6 h-6 stroke-[2]" />
        </div>
      </div>
    </div>
  );
}
