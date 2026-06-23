/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle, Users, Terminal } from 'lucide-react';
import { ResourceCapacity, SprintStory, Resource } from '../types';
import { isResourceInRegion, getMatchedCsvResource } from '../utils/resourceResolver';
import { useCapacityStore } from '../store/useCapacityStore';

interface CapacityValidationProps {
  capacities: ResourceCapacity[];
  stories: SprintStory[];
  onUpdateCapacity: (name: string, newVal: number) => void;
  onProceed: () => void;
  managerRegion: string;
  csvResources: Resource[];
}

export default function CapacityValidation({
  stories,
  onProceed,
  managerRegion,
  csvResources,
}: CapacityValidationProps) {
  
  const [isDebugExpanded, setIsDebugExpanded] = React.useState(true);
  const allocationHealth = useCapacityStore(state => state.allocationHealth);

  const resourceAllocations = allocationHealth?.detailedAllocations || [];

  const getStoriesForResource = React.useCallback((resourceName: string) => {
    return stories.filter(story => {
      if (!story.resourceName || story.resourceName.toLowerCase() === 'unassigned') return false;
      const matched = getMatchedCsvResource(story.resourceName, csvResources);
      const targetName = matched ? matched.displayName : story.resourceName;
      return targetName.toLowerCase().trim() === resourceName.toLowerCase().trim();
    });
  }, [stories, csvResources]);

  const summary = React.useMemo(() => {
    return {
      balanced: allocationHealth?.balancedCount || 0,
      underallocated: allocationHealth?.underallocatedCount || 0,
      overallocated: allocationHealth?.overallocatedCount || 0,
      reviewNeededList: resourceAllocations.filter(r => r.status !== 'Balanced'),
    };
  }, [allocationHealth, resourceAllocations]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-black animate-fade-in">
      
      {/* Page Title & Desc */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
          Allocation Health Check
        </h1>
        <p className="text-zinc-500 text-xs">
          Validate Sprint Allocation Health. Every resource in <span className="font-bold text-zinc-750 uppercase">{managerRegion}</span> is expected to be allocated approximately 5 points.
        </p>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Balanced Card */}
        <div className="bg-emerald-50/50 border border-emerald-200/60 p-4.5 rounded-2xl flex items-center space-x-3 shadow-sm">
          <div className="bg-emerald-500 text-white p-2.5 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Balanced</span>
            <p className="text-2xl font-black text-emerald-950 mt-0.5">{summary.balanced} <span className="text-xs font-bold text-emerald-700/80">members</span></p>
          </div>
        </div>

        {/* Underallocated Card */}
        <div className="bg-amber-50/50 border border-amber-200/60 p-4.5 rounded-2xl flex items-center space-x-3 shadow-sm">
          <div className="bg-amber-500 text-white p-2.5 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Underallocated</span>
            <p className="text-2xl font-black text-amber-950 mt-0.5">{summary.underallocated} <span className="text-xs font-bold text-amber-700/80">members</span></p>
          </div>
        </div>

        {/* Overallocated Card */}
        <div className="bg-red-50/50 border border-red-200/60 p-4.5 rounded-2xl flex items-center space-x-3 shadow-sm">
          <div className="bg-red-500 text-white p-2.5 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-red-800 tracking-wider">Overallocated</span>
            <p className="text-2xl font-black text-red-950 mt-0.5">{summary.overallocated} <span className="text-xs font-bold text-red-700/80">members</span></p>
          </div>
        </div>
      </div>

      {/* Warnings / Needs Review Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-1 border-b border-zinc-100">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <h2 className="text-sm font-black uppercase tracking-tight text-zinc-900">
            Needs Review ({summary.reviewNeededList.length})
          </h2>
        </div>
        
        {summary.reviewNeededList.length === 0 ? (
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Success: All team members have healthy sprint allocations!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {summary.reviewNeededList.map(row => {
              const absVal = Math.abs(row.variance);
              const message = row.status === 'Underallocated' 
                ? `Missing ${absVal} pt` 
                : `Overallocated by ${absVal} pt`;
                
              return (
                <div 
                  key={row.resourceName}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    row.status === 'Underallocated'
                      ? 'bg-amber-50/40 border-amber-200/40 text-amber-900'
                      : 'bg-red-50/40 border-red-200/45 text-red-900'
                  }`}
                >
                  <span className="truncate">{row.resourceName}</span>
                  <span className="font-mono text-[11px] uppercase tracking-wide bg-white px-2.5 py-1 rounded-md border border-inherit shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex-shrink-0 ml-4">
                    {message}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Allocation Health Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Individual Member Status roster</span>
          <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-200 px-2 py-0.5 rounded uppercase">{managerRegion} REGION</span>
        </div>
        <table className="w-full text-left text-xs divide-y divide-zinc-200 border-collapse">
          <thead className="bg-[#111111] text-white">
            <tr>
              <th className="px-6 py-4 text-[#FFCD11] uppercase tracking-widest font-black text-[10px]">Resource</th>
              <th className="px-6 py-4 text-[#FFCD11] uppercase tracking-widest font-black text-[10px] text-center w-36">Allocated Points</th>
              <th className="px-6 py-4 text-[#FFCD11] uppercase tracking-widest font-black text-[10px] text-center w-40">Expected Points (5)</th>
              <th className="px-6 py-4 text-[#FFCD11] uppercase tracking-widest font-black text-[10px] text-center w-32">Variance</th>
              <th className="px-6 py-4 text-[#FFCD11] uppercase tracking-widest font-black text-[10px] text-center w-44">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-150 bg-white font-semibold">
            {resourceAllocations.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-zinc-450 uppercase tracking-wider font-bold">
                  No resource profiles loaded for {managerRegion}.
                </td>
              </tr>
            ) : (
              resourceAllocations.map(row => {
                const varSign = row.variance > 0 ? `+${row.variance}` : `${row.variance}`;
                return (
                  <tr key={row.resourceName} className="hover:bg-zinc-50 transition-colors">
                    {/* RESOURCE NAME */}
                    <td className="px-6 py-4 text-zinc-900 font-bold">
                      {row.resourceName}
                    </td>

                    {/* ALLOCATED POINTS */}
                    <td className="px-6 py-4 text-center font-mono font-bold text-sm text-zinc-805">
                      {row.allocated}
                    </td>

                    {/* EXPECTED POINTS */}
                    <td className="px-6 py-4 text-center font-mono text-zinc-500">
                      5.0
                    </td>

                    {/* VARIANCE */}
                    <td className={`px-6 py-4 text-center font-mono font-bold ${
                      row.variance === 0 
                        ? 'text-emerald-600' 
                        : row.variance > 0 
                        ? 'text-red-600' 
                        : 'text-amber-600'
                    }`}>
                      {row.variance === 0 ? '0.0' : varSign}
                    </td>

                    {/* STATUS BADGES */}
                    <td className="px-6 py-4 text-center">
                      {row.status === 'Balanced' && (
                        <span className="px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-wider bg-emerald-100/80 text-emerald-800">
                          Balanced
                        </span>
                      )}
                      {row.status === 'Underallocated' && (
                        <span className="px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-wider bg-amber-100/70 text-amber-800">
                          Underallocated
                        </span>
                      )}
                      {row.status === 'Overallocated' && (
                        <span className="px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-wider bg-red-100/80 text-red-600">
                          Overallocated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Allocation Debug Mode Panel (Allocation Debug Mode) */}
      <div id="allocation-debug-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden text-zinc-300 font-sans">
        <div 
          onClick={() => setIsDebugExpanded(!isDebugExpanded)}
          className="p-4 bg-black border-b border-zinc-800 flex items-center justify-between cursor-pointer group text-zinc-100 select-none"
        >
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-[#FFCD11]" />
            <div className="text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-white leading-tight">
                Allocation Engine Telemetry Diagnostics (Allocation Debug Mode)
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono tracking-tight mt-0.5">
                Detailed story mapping allocations, variance counts, and expected capacities per engineer
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-zinc-400 group-hover:text-white transition-colors">
            <span className="text-[9px] font-mono uppercase bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-semibold">
              Debug Mode Active
            </span>
          </div>
        </div>

        {isDebugExpanded && (
          <div className="p-5 space-y-4 bg-[#111111]/90">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resourceAllocations.map(row => {
                const resourceStories = getStoriesForResource(row.resourceName);
                return (
                  <div key={row.resourceName} className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-3 font-mono text-xs text-left">
                    <div className="flex justify-between items-start border-b border-zinc-900 pb-2">
                      <div>
                        <h4 className="font-extrabold text-[#FFCD11] text-xs uppercase">{row.resourceName}</h4>
                        <span className="text-[8px] text-zinc-500 uppercase font-black uppercase tracking-wider">Resource Node</span>
                      </div>
                      <div className="text-right text-[10px]">
                        <p className="text-zinc-400">Expected: <span className="text-white font-bold">{row.expected} pt</span></p>
                        <p className="text-zinc-450 mt-0.5">Allocated: <span className="text-[#FFCD11] font-extrabold">{row.allocated} pt</span></p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Metrics:</p>
                      <ul className="text-[10px] text-zinc-400 space-y-1 leading-normal">
                        <li>• Expected Capacity: <span className="text-white font-semibold">{row.expected}</span></li>
                        <li>• Parsed Stories Count: <span className="text-[#FFCD11] font-semibold">{resourceStories.length}</span></li>
                        <li>• Allocated Points: <span className="text-emerald-400 font-semibold">{row.allocated}</span></li>
                        <li>• Story IDs Used: <span className="text-zinc-300">{resourceStories.map(s => s.featureId || s.id).join(', ') || 'N/A'}</span></li>
                      </ul>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Story List:</p>
                      {resourceStories.length === 0 ? (
                        <p className="text-[10px] text-zinc-600 italic">No allocations mapped.</p>
                      ) : (
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {resourceStories.map((s, sIndex) => (
                            <div key={`${s.id || 'story'}-${sIndex}`} className="bg-zinc-900 border border-zinc-855 p-2 rounded text-[9px] flex justify-between items-center text-zinc-300">
                              <span className="truncate max-w-[180px]" title={s.title}>
                                {s.featureId ? `Feature ${s.featureId}: ` : ''}{s.title}
                              </span>
                              <span className="font-bold text-[#FFCD11] ml-2 flex-shrink-0">{s.points} pt</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Information Dashboard & Continue CTA */}
      <div className="bg-zinc-50/50 border border-zinc-250 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-zinc-900 text-[#FFCD11] p-2 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-left">
            <span className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-400 block">Sprint Readiness Summary</span>
            <p className="text-zinc-700 font-bold">
              {summary.reviewNeededList.length === 0 
                ? `Ready to push backlog. All ${resourceAllocations.length} team members are balanced.` 
                : `${summary.reviewNeededList.length} members deviate from healthy sprint limits. Warning flags issued.`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onProceed}
          className="w-full md:w-auto inline-flex items-center justify-center space-x-1 bg-black text-[#FFCD11] hover:bg-zinc-800 border border-zinc-950 px-6 py-3.5 rounded-xl font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 duration-150 text-xs"
        >
          <span>Continue to Creation</span>
          <ArrowRight className="w-4 h-4 ml-0.5" />
        </button>
      </div>

    </div>
  );
}
