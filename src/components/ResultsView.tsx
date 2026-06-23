/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Play, Download, RefreshCw, AlertCircle, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { SprintStory, SyncResultItem, Resource, ResourceCapacity } from '../types';
import { useSyncStore } from '../store/useSyncStore';
import { useToastStore } from '../store/useToastStore';
import { isResourceInRegion } from '../utils/resourceResolver';
import { useCapacityStore } from '../store/useCapacityStore';

interface ResultsViewProps {
  stories: SprintStory[];
  onReset: () => void;
  orgName?: string;
  projectName?: string;
  areaPath?: string;
  iterationPath?: string;
  azureFunctionUrl?: string;
  enableSubTasks?: boolean;
  onUpdateSettings?: (vals: { areaPath?: string; iterationPath?: string; azureFunctionUrl?: string; enableSubTasks?: boolean }) => void;
  managerRegion: string;
  csvResources: Resource[];
  capacities: ResourceCapacity[];
}

export default function ResultsView({
  stories,
  onReset,
  orgName = 'CaterpillarGlobal',
  projectName = 'SprintSync-Platform',
  areaPath = 'SprintSync\\Energy',
  iterationPath = 'SprintSync\\Iteration-06',
  azureFunctionUrl = '/api',
  enableSubTasks = false,
  onUpdateSettings,
  managerRegion,
  csvResources,
  capacities,
}: ResultsViewProps) {
  const {
    currentStatus,
    currentStoryIndex,
    currentStoryTitle,
    syncedItems,
    startSync,
    cancelSync,
    retryFailed,
    resetSyncState,
  } = useSyncStore();

  const [localAreaPath, setLocalAreaPath] = useState(areaPath);
  const [localIterationPath, setLocalIterationPath] = useState(iterationPath);

  React.useEffect(() => {
    setLocalAreaPath(areaPath);
  }, [areaPath]);

  React.useEffect(() => {
    setLocalIterationPath(iterationPath);
  }, [iterationPath]);

  // Dry run confirmation checkbox state
  const [managerConfirmedDryRun, setManagerConfirmedDryRun] = useState(false);
  const [showBatchValidation, setShowBatchValidation] = useState(false);

  // Filter stories strictly corresponding to the manager's region
  const regionalStories = useMemo(() => {
    return stories.filter(s => isResourceInRegion(s.resourceName, managerRegion, csvResources));
  }, [stories, managerRegion, csvResources]);

  // Count resources of the current region present in the LDAP database
  const resourcesCount = useMemo(() => {
    return csvResources.filter(r => (r.region || '').toLowerCase() === managerRegion.toLowerCase()).length;
  }, [csvResources, managerRegion]);

  // Allocation metrics
  const allocationHealth = useCapacityStore(state => state.allocationHealth);

  const allocationSummaryObj = useMemo(() => {
    return {
      balanced: allocationHealth?.balancedCount || 0,
      underallocated: allocationHealth?.underallocatedCount || 0,
      overallocated: allocationHealth?.overallocatedCount || 0,
      totalWarnings: allocationHealth?.warningCount || 0,
    };
  }, [allocationHealth]);

  // Derived counts using isolated collections
  const totalStories = regionalStories.length;
  const createdCount = syncedItems.filter(i => i.status === 'Published').length;
  const failedCount = syncedItems.filter(i => i.status === 'Failed').length;
  const skippedCount = syncedItems.filter(i => i.status === 'Skipped').length;

  const estAdoCalls = useMemo(() => {
    if (!enableSubTasks) return totalStories;
    let total = 0;
    regionalStories.forEach(s => {
      let currentType = 'User Story';
      if (s.workType) {
        const wt = s.workType.toLowerCase();
        if (wt.includes('task')) currentType = 'Task';
        else if (wt.includes('bug')) currentType = 'Bug';
        else if (wt.includes('feature')) currentType = 'Feature';
        else if (wt.includes('epic')) currentType = 'Epic';
      }
      if (currentType === 'User Story') {
        total += 4;
      } else {
        total += 1;
      }
    });
    return total;
  }, [regionalStories, enableSubTasks, totalStories]);

  // AZURE VALIDATION ENGINE
  // Checking the 6 safety rules specified:
  // 1. Resource Email Exists (for assigned resources)
  // 2. Title Exists
  // 3. Area Path Exists
  // 4. Iteration Path Exists
  // 5. Points Exist (points > 0)
  // 6. No Unknown Resources (confidence must be >= 85%)
  const validations = useMemo(() => {
    const checks = {
      emailExists: { passed: true, message: 'All assignees have verified Confluence LDAP emails.' },
      titleExists: { passed: true, message: 'All stories have valid, non-empty titles.' },
      areaPathExists: { passed: true, message: 'Area path configuration exists.' },
      iterationPathExists: { passed: true, message: 'Iteration path configuration exists.' },
      pointsExist: { passed: true, message: 'All stories have positive allocation weights (>0).' },
      noUnknownResources: { passed: true, message: 'All assignees have resolved LDAP database profiles (no Unknown Items).' },
    };

    if (!localAreaPath.trim()) {
      checks.areaPathExists = { passed: false, message: 'Area Path is mandatory.' };
    }
    if (!localIterationPath.trim()) {
      checks.iterationPathExists = { passed: false, message: 'Iteration Path is mandatory.' };
    }

    for (const story of regionalStories) {
      if (story.resourceName !== 'Unassigned' && !story.email?.trim()) {
        checks.emailExists = { passed: false, message: `Story "${story.title.slice(0, 20)}..." lacks a synchronized LDAP email.` };
      }
      if (!story.title || !story.title.trim()) {
        checks.titleExists = { passed: false, message: 'One or more stories have empty titles.' };
      }
      if (story.points === undefined || story.points === null || story.points <= 0) {
        checks.pointsExist = { passed: false, message: `Story "${story.title.slice(0, 20)}..." lacks a valid points weight.` };
      }
      if (story.resourceName !== 'Unassigned' && story.confidence && story.confidence < 85) {
        checks.noUnknownResources = { passed: false, message: 'Unknown/low confidence assignees reside in your backlog. Please map them in Step 2.' };
      }
    }

    const allPassed = Object.values(checks).every(c => c.passed);
    return { checks, allPassed };
  }, [regionalStories, localAreaPath, localIterationPath]);

  // Start Bulk Creation
  const handleCreateStories = () => {
    if (!validations.allPassed) {
      useToastStore.getState().addToast('Cannot create stories. Validation checks failed.', 'error');
      return;
    }
    if (!managerConfirmedDryRun) {
      useToastStore.getState().addToast('Please confirm the dry run metrics before starting bulk creation.', 'warning');
      return;
    }

    setShowBatchValidation(true);
  };

  const handleConfirmSubmit = () => {
    setShowBatchValidation(false);

    // Sync paths to parents
    if (onUpdateSettings) {
      onUpdateSettings({
        areaPath: localAreaPath,
        iterationPath: localIterationPath,
        azureFunctionUrl,
      });
    }

    // Attach current paths and verify work item types for regional stories only
    const updatedStories = regionalStories.map(s => {
      const defaultWorkItemType = localStorage.getItem('sprintsync_default_work_item_type') || 'User Story';
      const selectedWorkType = s.workType || defaultWorkItemType || 'User Story';
      return {
        ...s,
        workType: selectedWorkType as any,
        areaPath: localAreaPath,
        iterationPath: localIterationPath,
      };
    });

    startSync(updatedStories, orgName, projectName, localAreaPath, localIterationPath, azureFunctionUrl, enableSubTasks);
  };

  // Export Results function
  const handleExportCSV = () => {
    const headers = ['Story ID', 'Title', 'Assignee', 'Weight (pt)', 'Status', 'Error Message'];
    const rows = syncedItems.map(item => [
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.assignedUser}"`,
      item.points,
      item.status,
      `"${(item.errorMessage || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SprintSync_Creation_Results.csv`;
    link.click();
    useToastStore.getState().addToast('Results exported to CSV successfully.', 'success');
  };

  const handleRetryFailedLocal = () => {
    retryFailed(orgName, projectName, localAreaPath, localIterationPath, azureFunctionUrl, enableSubTasks);
  };

  // Determine resources impacted by creation in current region selection
  const uniqueResourcesImpacted = useMemo(() => {
    const set = new Set<string>();
    regionalStories.forEach(s => {
      if (s.resourceName && s.resourceName !== 'Unassigned') {
        set.add(s.resourceName);
      }
    });
    return set.size;
  }, [regionalStories]);

  return (
    <div className="max-w-xl mx-auto font-sans text-black animate-fade-in space-y-6">
      
      {/* ⚠️ STATE 1: IDLE / EDIT PARAMS */}
      {currentStatus === 'idle' && (
        <div className="bg-white border border-zinc-200 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Step 04 — DevOps Sync</span>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
              Create Stories
            </h1>
            <p className="text-zinc-500 text-xs font-semibold">
              Assign Iteration Paths, inspect validation, and batch write stories into Azure DevOps.
            </p>
          </div>

          {/* Form parameters */}
          <div className="space-y-4 text-xs font-semibold">
            {/* Iteration path input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                Iteration Path
              </label>
              <input
                type="text"
                value={localIterationPath}
                onChange={(e) => setLocalIterationPath(e.target.value)}
                placeholder="SprintSync\\Iteration-06"
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-xs"
              />
            </div>

            {/* Area path input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                Area Path
              </label>
              <input
                type="text"
                value={localAreaPath}
                onChange={(e) => setLocalAreaPath(e.target.value)}
                placeholder="SprintSync\\Energy"
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-black text-xs"
              />
            </div>

            {/* Optional sub-task creation toggle */}
            <div className="pt-1.5">
              <label className="flex items-start space-x-2.5 bg-zinc-50 hover:bg-zinc-100 p-3 rounded-xl border border-zinc-200 cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={enableSubTasks}
                  onChange={(e) => {
                    if (onUpdateSettings) {
                      onUpdateSettings({ enableSubTasks: e.target.checked });
                    }
                  }}
                  className="mt-0.5 rounded border-zinc-300 text-black focus:ring-black"
                />
                <div className="text-left">
                  <span className="block text-xs font-bold text-zinc-800">
                    Auto-generate Child Tasks
                  </span>
                  <span className="block text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
                    Creates Functional Validation, Automation, and Regression tasks linked as child items.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Allocation Health Split Details */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-150 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Allocation Health Summary ({managerRegion})</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                allocationSummaryObj.totalWarnings > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-250'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {allocationSummaryObj.totalWarnings > 0 ? 'Needs Review' : 'Healthy'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold pt-1">
              <div className="bg-white p-2.5 rounded-xl border border-zinc-200">
                <span className="text-[9px] font-extrabold uppercase text-emerald-700 block">Balanced</span>
                <span className="font-mono text-emerald-950 mt-0.5 block">{allocationSummaryObj.balanced}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-zinc-200">
                <span className="text-[9px] font-extrabold uppercase text-amber-700 block">Under</span>
                <span className="font-mono text-amber-950 mt-0.5 block">{allocationSummaryObj.underallocated}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-zinc-200">
                <span className="text-[9px] font-extrabold uppercase text-red-700 block">Over</span>
                <span className="font-mono text-red-950 mt-0.5 block">{allocationSummaryObj.overallocated}</span>
              </div>
            </div>
          </div>

          {/* AZURE GATEWAY VALIDATION CHECKLIST */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3.5">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
              Azure Ingress Validation Checklist
            </span>

            <div className="space-y-2 text-[11px] font-semibold">
              {Object.entries(validations.checks).map(([key, check]) => (
                <div key={key} className="flex items-start space-x-2">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[8.5px] mt-0.5 select-none ${
                    check.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {check.passed ? '✓' : '✗'}
                  </span>
                  <span className={check.passed ? 'text-zinc-600' : 'text-red-700 font-extrabold'}>
                    {check.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* DRY RUN MODE CONSOLE */}
          {validations.allPassed && (
            <div className="bg-[#FFCD11]/5 border-2 border-[#FFCD11] rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-black uppercase text-black tracking-wider block">
                ⚡ PRE-FLIGHT DRY RUN SIMULATION MODE (LOCAL PREVIEW)
              </span>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-extrabold p-1">
                <div className="space-y-0.5">
                  <span className="text-zinc-500 uppercase text-[9px] font-black">Stories To Create:</span>
                  <p className="text-black text-sm font-black">{totalStories} User Stories</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-zinc-500 uppercase text-[9px] font-black">Resources Impacted:</span>
                  <p className="text-black text-sm font-black">{uniqueResourcesImpacted} LDAP Profile(s)</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-zinc-500 uppercase text-[9px] font-black">Area Route:</span>
                  <p className="text-zinc-800 truncate font-mono text-[10px]">{localAreaPath || 'None'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-zinc-500 uppercase text-[9px] font-black">Iteration Path:</span>
                  <p className="text-zinc-800 truncate font-mono text-[10px]">{localIterationPath || 'None'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-zinc-500 uppercase text-[9px] font-black">Default Tags:</span>
                  <p className="text-zinc-800 font-mono text-[10px]">[SprintSync, {managerRegion}]</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-zinc-500 uppercase text-[9px] font-black">Est. ADO Operations:</span>
                  <p className="text-[#222222] font-black text-sm">{estAdoCalls} API Calls</p>
                </div>
              </div>

              {/* Confirmation Checkbox to satisfy "Manager must confirm" */}
              <label className="flex items-start space-x-2 bg-white/60 p-2.5 rounded-lg border border-[#FFCD11]/30 cursor-pointer text-zinc-800 text-[10.5px] font-bold select-none">
                <input
                  type="checkbox"
                  checked={managerConfirmedDryRun}
                  onChange={(e) => setManagerConfirmedDryRun(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-200 text-black focus:ring-black"
                />
                <span>I have audited the dry run metrics and hereby authorize bulk story write-operations inside Azure DevOps.</span>
              </label>
            </div>
          )}

          {/* Blocked Errors check */}
          {!validations.allPassed && (
            <div className="flex items-start space-x-2.5 bg-red-50 border border-red-200 p-3.5 rounded-xl text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-650" />
              <div className="space-y-0.5">
                <span className="font-extrabold uppercase text-[10px] tracking-wider block text-red-800">Publishing Locked</span>
                <span className="block text-zinc-650 font-medium leading-relaxed">
                  LDAP matching or path errors were discovered. You are strictly forbidden from bulk-creating items inside Azure DevOps until all validation checks above are fully resolved.
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleCreateStories}
            disabled={!validations.allPassed || !managerConfirmedDryRun || totalStories === 0}
            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
              validations.allPassed && managerConfirmedDryRun && totalStories > 0
                ? 'bg-black text-[#FFCD11] hover:bg-zinc-900 cursor-pointer active:scale-[0.99] hover:shadow-md'
                : 'bg-zinc-100 text-zinc-350 border border-zinc-200 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current text-current stroke-[2.5]" />
            <span>Create Azure DevOps Stories</span>
          </button>
        </div>
      )}

      {/* 🔄 STATE 2: CREATION PROGRESS */}
      {currentStatus === 'syncing' && (
        <div className="bg-white border border-zinc-200 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-xs font-black uppercase tracking-wider text-zinc-400">Creation Pipeline</h1>
            <p className="text-sm font-bold text-zinc-850">
              Creating Story {currentStoryIndex + 1} of {totalStories}
            </p>
            <p className="text-zinc-505 text-[11px] font-mono truncate max-w-sm mx-auto italic mt-1 bg-zinc-50 p-1.5 rounded border border-zinc-100">
              "{currentStoryTitle}"
            </p>
          </div>

          {/* Simple Clean Progress Bar */}
          <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#FFCD11] h-full transition-all duration-300"
              style={{ width: `${((currentStoryIndex + 1) / totalStories) * 100}%` }}
            />
          </div>

          {/* Pipeline counts */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100/50">
              <span className="text-[10px] font-black uppercase text-emerald-800 block">Created</span>
              <span className="text-xl font-black text-emerald-600 block mt-1">{createdCount}</span>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100/50">
              <span className="text-[10px] font-black uppercase text-red-800 block">Failed</span>
              <span className="text-xl font-black text-red-500 block mt-1">{failedCount}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={cancelSync}
            className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
          >
            Abort Connection
          </button>
        </div>
      )}

      {/* 🏁 STATE 3: RESULTS SUMMARY & TABLE */}
      {(currentStatus === 'completed' || currentStatus === 'cancelled') && (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="bg-white border border-zinc-200 p-8 rounded-2xl shadow-sm space-y-6 text-center">
            <div className="space-y-1">
              <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
                Sync Outcome Dashboard
              </h1>
              <p className="text-zinc-550 text-xs">
                Review integration logs and DevOps response payload codes.
              </p>
            </div>

            {/* Matrix result metrics */}
            <div className="grid grid-cols-3 gap-3 font-semibold text-xs">
              <div className="bg-zinc-50 p-4.5 rounded-xl border border-zinc-100">
                <span className="text-[9px] font-black uppercase block text-emerald-800">Created</span>
                <span className="text-xl font-black text-emerald-600 block mt-1">{createdCount}</span>
              </div>
              <div className="bg-zinc-50 p-4.5 rounded-xl border border-zinc-100">
                <span className="text-[9px] font-black uppercase block text-red-800">Failed</span>
                <span className="text-xl font-black text-red-500 block mt-1">{failedCount}</span>
              </div>
              <div className="bg-zinc-50 p-4.5 rounded-xl border border-zinc-100">
                <span className="text-[9px] font-black uppercase block text-zinc-450">Skipped</span>
                <span className="text-xl font-black text-zinc-500 block mt-1">{skippedCount}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {failedCount > 0 && (
                <button
                  type="button"
                  onClick={handleRetryFailedLocal}
                  className="flex-1 py-3 bg-[#FFCD11] hover:bg-black hover:text-[#FFCD11] text-[#111111] font-bold text-xs uppercase rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Failed</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex-1 py-3 bg-black hover:bg-zinc-800 text-[#FFCD11] font-bold text-xs uppercase rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>

            <button
              type="button"
              onClick={resetSyncState}
              className="text-xs font-bold text-zinc-450 hover:text-black uppercase tracking-widest block mx-auto underline pt-1 transition-colors cursor-pointer"
            >
              Start New Sync
            </button>
          </div>

          {/* Results Table list */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Integration Backlot Log</span>
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-zinc-100">
              {syncedItems.map(item => {
                return (
                  <div key={item.id} className="p-3.5 px-5 flex items-center justify-between text-xs font-semibold">
                    <div className="space-y-0.5 truncate max-w-xs">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tight block">Story-{item.id.slice(-5)}</span>
                      <p className="text-zinc-800 font-bold truncate">{item.title}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.status === 'Published' && (
                        <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>WI-{item.azureWorkItemId}</span>
                        </div>
                      )}
                      {item.status === 'Failed' && (
                        <div className="flex items-center space-x-1 text-red-600 bg-red-50 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase" title={item.errorMessage}>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </div>
                      )}
                      {item.status === 'Skipped' && (
                        <div className="flex items-center space-x-1 text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                          <span>Skipped</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showBatchValidation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
            
            {/* Header */}
            <div className="p-6 border-b border-zinc-150 bg-zinc-50 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">Manager Audit Required</span>
              <h2 className="text-lg font-black uppercase text-zinc-900 tracking-tight">
                Batch Validation & Verification Screen
              </h2>
              <p className="text-zinc-500 text-xs font-semibold">
                Please verify work item types for each story before final upload to Azure DevOps. All rows are bound explicitly to avoid inheritance or cross-contamination.
              </p>
            </div>

            {/* Content Table */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <th className="p-3 font-semibold">Work Item Title</th>
                      <th className="p-3 font-semibold">Assigned Resource</th>
                      <th className="p-3 font-semibold text-center">Work Item Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 font-semibold text-zinc-700">
                    {regionalStories.map((story) => {
                      const defaultWorkItemType = localStorage.getItem('sprintsync_default_work_item_type') || 'User Story';
                      const currentType = story.workType || defaultWorkItemType || 'User Story';
                      
                      let typeColor = 'bg-zinc-50 text-zinc-700 border-zinc-200';
                      if (currentType === 'User Story') typeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                      else if (currentType === 'Feature') typeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                      else if (currentType === 'Task') typeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      else if (currentType === 'Bug') typeColor = 'bg-red-50 text-red-700 border-red-200';
                      else if (currentType === 'Epic') typeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';

                      return (
                        <tr key={story.id} className="hover:bg-zinc-50/50">
                          <td className="p-3 font-bold text-zinc-900 max-w-xs truncate">
                            {story.title}
                          </td>
                          <td className="p-3 text-zinc-650 truncate">
                            {story.resourceName}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase border rounded-md ${typeColor}`}>
                              {currentType}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-amber-50 border border-amber-250 p-3.5 rounded-xl text-amber-950 text-[11px] leading-relaxed flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" />
                <span>
                  <strong>Strict Mapping Mode Activated:</strong> Every item will be processed individually within the transaction queue. There is zero state inheritance between rows assigned to the same user.
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-zinc-150 bg-zinc-50 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowBatchValidation(false)}
                className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-xs rounded-lg hover:bg-zinc-100 transition-colors uppercase tracking-wider"
              >
                Go Back / Refine
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-5 py-2.5 bg-black text-[#FFCD11] hover:bg-zinc-900 font-black text-xs rounded-lg transition-colors uppercase tracking-widest flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Confirm & Upload to DevOps</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
