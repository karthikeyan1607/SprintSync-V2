/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock
} from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';
import { SprintStory } from '../types';

interface SyncProgressPageProps {
  stories: SprintStory[];
  orgName: string;
  projectName: string;
  onViewResults: () => void;
}

export default function SyncProgressPage({
  stories,
  orgName,
  projectName,
  onViewResults
}: SyncProgressPageProps) {
  const {
    isSyncing,
    currentStatus,
    currentStoryIndex,
    currentStoryTitle,
    syncedItems,
    logs,
    cancelPending,
    durationSeconds,
    startSync,
    cancelSync
  } = useSyncStore();

  const activityEndRef = useRef<HTMLDivElement>(null);

  // Trigger sync on mount if idle
  useEffect(() => {
    if (currentStatus === 'idle') {
      startSync(stories, orgName, projectName);
    }
  }, [stories, orgName, projectName, currentStatus, startSync]);

  const totalStories = stories.length;
  const createdCount = syncedItems.filter(i => i.status === 'Published').length;
  const failedCount = syncedItems.filter(i => i.status === 'Failed').length;
  const skippedCount = syncedItems.filter(i => i.status === 'Skipped').length;
  const processedCount = syncedItems.length;

  const percentage = totalStories > 0 ? Math.round((currentStoryIndex / totalStories) * 100) : 0;

  // Find the latest failure
  const latestFailure = syncedItems.filter(i => i.status === 'Failed').slice(-1)[0];

  // Helper formatting for duration
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. PROGRESS HEADER */}
      <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="inline-flex items-center space-x-2 bg-yellow-400/20 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-zinc-950 fill-black" />
            )}
            <span>ADO Deployment Center</span>
          </div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">
            {isSyncing ? 'Stories Creation Pipeline in Progress' : 'Publishing Session Complete'}
          </h2>
          <p className="text-xs text-zinc-500 max-w-2xl font-medium">
            Publishing to org <strong className="text-zinc-800 font-semibold">{orgName}</strong> project <strong className="text-zinc-800 font-semibold">{projectName}</strong>
          </p>
        </div>

        {/* Sync duration / cancellation controllers */}
        <div className="flex items-center space-x-4 self-start md:self-center">
          <div className="flex items-center space-x-2 bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-700">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="font-mono">Time Elapsed: {formatDuration(durationSeconds)}</span>
          </div>

          {currentStatus === 'syncing' ? (
            <button
              onClick={cancelSync}
              disabled={cancelPending}
              className={`px-4 py-2.5 border rounded-xl font-extrabold text-xs uppercase tracking-wide flex items-center space-x-2 shadow-sm transition active:scale-95 duration-200 cursor-pointer ${
                cancelPending 
                  ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                  : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300'
              }`}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{cancelPending ? 'Aborting...' : 'Stop Processing'}</span>
            </button>
          ) : (
            <button
              onClick={onViewResults}
              className="px-5 py-2.5 bg-black text-[#FFCD11] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-900 transition flex items-center shadow-md cursor-pointer active:scale-95"
            >
              <span>View Results Summary</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </div>

      {/* 2. OVERALL PROGRESS BAR */}
      <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-zinc-700 uppercase tracking-wide flex items-center">
            {isSyncing ? (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping mr-2" />
                <span>Creating Story {currentStoryIndex + 1} of {totalStories}</span>
              </>
            ) : currentStatus === 'cancelled' ? (
              <span className="text-red-700">Sync Cancelled By User</span>
            ) : (
              <span className="text-emerald-700">All Done! Sync Completed</span>
            )}
          </span>
          <span className="font-black text-sm font-mono text-zinc-900">{percentage}%</span>
        </div>

        {/* Outer bar */}
        <div className="w-full bg-zinc-100 h-4.5 rounded-full overflow-hidden border border-zinc-200 p-0.5 shadow-inner">
          <div
            style={{ width: `${percentage}%` }}
            className="bg-[#FFCD11] h-full rounded-full transition-all duration-300 relative shadow-sm"
          >
            {percentage > 5 && (
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            )}
          </div>
        </div>

        {isSyncing && currentStoryTitle && (
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Current Story scope</span>
            <p className="text-xs font-bold font-mono text-zinc-800 mt-1 truncate">{currentStoryTitle}</p>
          </div>
        )}
      </div>

      {/* 3. PROGRESS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Selected */}
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-center relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-zinc-500" />
          <p className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">Selected</p>
          <p className="text-3xl font-black text-zinc-900 mt-2 font-mono">{totalStories}</p>
        </div>

        {/* Created Successful */}
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-center relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
          <p className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">Created</p>
          <p className="text-3xl font-black text-emerald-600 mt-2 font-mono">{createdCount}</p>
        </div>

        {/* Failed */}
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-center relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
          <p className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">Failed</p>
          <p className="text-3xl font-black text-red-650 mt-2 font-mono">{failedCount}</p>
        </div>

        {/* Skipped */}
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-center relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
          <p className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">Skipped</p>
          <p className="text-3xl font-black text-amber-600 mt-2 font-mono">{skippedCount}</p>
        </div>
      </div>

      {/* 4. ACTIVITY & ERROR DIVISION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Activity Feed console terminal */}
        <div className="lg:col-span-2 flex flex-col h-[400px] border border-zinc-200 rounded-2xl bg-[#111111] text-white shadow-lg overflow-hidden">
          <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-mono text-xs font-bold text-[#FFCD11] uppercase tracking-wider flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mr-2" />
              Live Activity Pipeline Feed
            </span>
            <span className="text-[9px] font-mono text-zinc-500 uppercase font-black">Scroll Enabled</span>
          </div>

          {/* Activity printing console */}
          <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-3 scrollbar-thin dark-scrollbar">
            {logs.length === 0 ? (
              <div className="text-zinc-600 h-full flex flex-col items-center justify-center text-center italic">
                <p>Initializing active connection parameters...</p>
              </div>
            ) : (
              logs.map((log) => {
                let textColors = 'text-zinc-300';
                let iconSymbol = '⚙️';
                if (log.type === 'success') {
                  textColors = 'text-emerald-450';
                  iconSymbol = '✓';
                } else if (log.type === 'error') {
                  textColors = 'text-red-400 font-semibold';
                  iconSymbol = '✗';
                } else if (log.type === 'warning') {
                  textColors = 'text-amber-400';
                  iconSymbol = '⚠';
                } else {
                  textColors = 'text-sky-305';
                  iconSymbol = 'ℹ';
                }

                return (
                  <div key={log.id} className={`${textColors} flex items-start space-x-2`}>
                    <span className="font-bold flex-shrink-0 leading-none">{iconSymbol}</span>
                    <span className="text-[10px] text-zinc-500 font-semibold select-none flex-shrink-0 font-mono">[{log.timestamp}]</span>
                    <span className="whitespace-pre-wrap flex-1">{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={activityEndRef} />
          </div>
        </div>

        {/* Real-time Dynamic Error Panel */}
        <div className="border border-zinc-200 bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between h-[400px]">
          <div className="space-y-4">
            <div className="border-b border-zinc-100 pb-3 flex items-center space-x-2.5">
              <div className="bg-red-50 p-2 rounded-xl text-red-650">
                <AlertOctagon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900 uppercase tracking-wide">Real-time Failures</h3>
                <p className="text-[10px] font-medium text-zinc-400 uppercase">Alert console logger</p>
              </div>
            </div>

            {failedCount === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center text-zinc-400 space-y-2">
                <ShieldCheck className="w-10 h-10 text-emerald-500 animate-pulse" />
                <p className="font-bold text-xs uppercase text-zinc-700">No Failed Stories Detected</p>
                <p className="text-[10px] leading-relaxed max-w-xs">All processed items are registering valid handshakes on Azure cloud.</p>
              </div>
            ) : latestFailure ? (
              <div className="space-y-4.5 text-xs animate-fade-in bg-red-50/40 p-4 border border-red-100 rounded-xl">
                {/* Failure breakdown */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-700">Latest Failed Item</span>
                  <p className="font-bold text-zinc-900 truncate">
                    {latestFailure.title}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-700">Failure Reason</span>
                  <p className="font-medium text-red-800 leading-relaxed font-mono text-[11px] bg-white p-2 rounded border border-red-100">
                    {latestFailure.errorMessage}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#111111]">Recommended Resolution</span>
                  <p className="font-semibold text-zinc-700 leading-relaxed pl-2.5 border-l-2 border-[#FFCD11]">
                    {latestFailure.resolution}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Prompt reminder mapping count */}
          <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 flex items-center justify-between text-[10px] text-zinc-450 uppercase font-black">
            <span>Failed Stories: <strong className="text-red-600">{failedCount}</strong></span>
            <span>Unresolved warning stack active</span>
          </div>
        </div>

      </div>
    </div>
  );
}
