/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  Calendar, 
  Layers, 
  TrendingUp, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  SlidersHorizontal,
  ExternalLink,
  Archive,
  Info
} from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';
import { SyncAuditHistory, SyncResultItem } from '../types';

interface SyncHistoryPageProps {
  onBackToResults?: () => void;
}

export default function SyncHistoryPage({ onBackToResults }: SyncHistoryPageProps) {
  const { historyList, clearHistory, loadHistory } = useSyncStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'WithFailures' | 'CleanSuccess'>('All');
  const [expandedSyncId, setExpandedSyncId] = useState<string | null>(null);

  // Load history from store
  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Expand first row by default if available
  React.useEffect(() => {
    if (historyList.length > 0 && !expandedSyncId) {
      setExpandedSyncId(historyList[0].id);
    }
  }, [historyList, expandedSyncId]);

  // Handle Search and Filter logic
  const filteredHistory = useMemo(() => {
    return historyList.filter((sync) => {
      // Check query match (by sprint name, project name, or org name)
      const q = searchQuery.toLowerCase();
      const queryMatch = 
        sync.sprintName.toLowerCase().includes(q) ||
        sync.projectName.toLowerCase().includes(q) ||
        sync.orgName.toLowerCase().includes(q) ||
        sync.id.toLowerCase().includes(q);

      if (!queryMatch) return false;

      // Check Status Filter
      if (filterType === 'WithFailures') {
        return sync.failedCount > 0;
      }
      if (filterType === 'CleanSuccess') {
        return sync.failedCount === 0;
      }

      return true;
    });
  }, [historyList, searchQuery, filterType]);

  // Toggle row expander
  const toggleExpand = (id: string) => {
    setExpandedSyncId(expandedSyncId === id ? null : id);
  };

  const handleExportHistoryCSV = (sync: SyncAuditHistory) => {
    const headers = ['Title', 'Feature ID', 'Assigned User', 'Work Item ID', 'Status', 'Error Message', 'Created Timestamp'];
    const rows = sync.stories.map(item => [
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.featureId || ''}"`,
      `"${item.assignedUser}"`,
      `"${item.azureWorkItemId || ''}"`,
      `"${item.status}"`,
      `"${(item.errorMessage || '').replace(/"/g, '""')}"`,
      `"${item.createdDate}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SprintSync_History_${sync.sprintName.replace(/\s+/g, '_')}_${sync.id}.csv`;
    link.click();
  };

  // Human date parser
  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. SECTION TITLE GRID */}
      <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 bg-yellow-500/10 text-zinc-950 px-3 py-1 rounded-full text-xs font-semibold">
            <Archive className="w-3.5 h-3.5 text-zinc-850" />
            <span>Sync Audit Trail Database</span>
          </div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">
            Historical Synchronizations & Audit Logs
          </h2>
          <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
            Persistent archive pipeline records stored in local system boundaries, tracking metrics, success multipliers, durations, and ADO handshakes.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-center">
          {onBackToResults && (
            <button
              onClick={onBackToResults}
              className="px-4 py-2.5 bg-black text-[#FFCD11] hover:bg-zinc-900 text-xs font-extrabold uppercase rounded-xl transition cursor-pointer active:scale-95 duration-150"
            >
              <span>Back To Active Sync</span>
            </button>
          )}

          {historyList.length > 0 && (
            <button
              onClick={clearHistory}
              className="px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 hover:border-red-300 text-xs font-extrabold uppercase rounded-xl transition flex items-center space-x-2 cursor-pointer active:scale-95 duration-150"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Purge Audit DB</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTERS AND CONTROLS RAIL */}
      <div className="bg-white border border-zinc-200 p-4.5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Sprint or DevOps project..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-220 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-black"
          />
        </div>

        {/* Filters Select toggles */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <span className="text-[10px] uppercase font-black text-zinc-400 mr-2 flex items-center">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" /> Filters:
          </span>
          
          <button
            onClick={() => setFilterType('All')}
            className={`px-3.5 py-1.5 text-[10px] uppercase font-bold rounded-lg border transition ${
              filterType === 'All'
                ? 'bg-zinc-900 border-zinc-950 text-[#FFCD11]'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            All Runs ({historyList.length})
          </button>

          <button
            onClick={() => setFilterType('CleanSuccess')}
            className={`px-3.5 py-1.5 text-[10px] uppercase font-bold rounded-lg border transition ${
              filterType === 'CleanSuccess'
                ? 'bg-zinc-900 border-zinc-950 text-[#FFCD11]'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            100% Success ({historyList.filter(h => h.failedCount === 0).length})
          </button>

          <button
            onClick={() => setFilterType('WithFailures')}
            className={`px-3.5 py-1.5 text-[10px] uppercase font-bold rounded-lg border transition ${
              filterType === 'WithFailures'
                ? 'bg-zinc-900 border-zinc-950 text-[#FFCD11]'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Has Failures ({historyList.filter(h => h.failedCount > 0).length})
          </button>
        </div>
      </div>

      {/* 3. AUDIT RUNS CONTENT VIEW */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-3xl p-16 text-center shadow-xs">
          <div className="p-4 bg-yellow-500/10 rounded-full w-14 h-14 mx-auto text-black flex items-center justify-center mb-5 border border-[#FFCD11]/30">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-zinc-900 uppercase">No Previous Sync Results Found</h3>
          <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">
            There are no past synchronized cycles recorded representing the search filter constraints in this database.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((sync) => {
            const isExpanded = expandedSyncId === sync.id;
            const successPct = sync.totalStories > 0 ? Math.round((sync.createdCount / (sync.createdCount + sync.failedCount || 1)) * 100) : 100;
            const hasFailures = sync.failedCount > 0;

            return (
              <div 
                key={sync.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition duration-200 ${
                  isExpanded ? 'border-zinc-350' : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                
                {/* Accordion Trigger Summary Bar */}
                <div 
                  onClick={() => toggleExpand(sync.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer select-none hover:bg-zinc-50/40"
                >
                  
                  {/* Left Column info */}
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2 rounded-xl border flex items-center justify-center ${
                      hasFailures ? 'bg-red-50 border-red-100 text-red-650' : 'bg-emerald-50 border-emerald-100 text-emerald-650'
                    }`}>
                      {hasFailures ? (
                        <AlertTriangle className="w-5 h-5 text-red-650" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-zinc-900 uppercase">{sync.sprintName}</span>
                        <span className="font-mono text-[9px] text-zinc-400 font-extrabold uppercase bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">{sync.id}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wide">
                        Project: {sync.projectName} • Org: {sync.orgName}
                      </p>
                    </div>
                  </div>

                  {/* Mid Column stats review */}
                  <div className="grid grid-cols-4 gap-4 md:gap-8 text-center text-xs">
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-wide text-zinc-400">Total</p>
                      <p className="font-mono text-zinc-950 font-black mt-0.5">{sync.totalStories}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-wide text-emerald-500 font-semibold">Created</p>
                      <p className="font-mono text-emerald-600 font-black mt-0.5">{sync.createdCount}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-wide text-red-500 font-semibold">Failed</p>
                      <p className="font-mono text-red-600 font-black mt-0.5">{sync.failedCount}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-wide text-[#b08b00] font-semibold">Success</p>
                      <p className="font-mono text-zinc-900 font-black mt-0.5">{successPct}%</p>
                    </div>
                  </div>

                  {/* Right Column details */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t pt-3 md:border-transparent md:pt-0">
                    <div className="text-left md:text-right">
                      <p className="text-[9px] uppercase font-black tracking-wide text-zinc-400">Execution Date & Time</p>
                      <p className="text-zinc-650 font-semibold mt-0.5 text-[11px] flex items-center md:justify-end">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                        {formatDate(sync.timestamp)}
                      </p>
                    </div>

                    <div className="text-zinc-400">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-black" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </div>

                </div>

                {/* Sub-accordion Inner Detailed Viewer Grid */}
                {isExpanded && (
                  <div className="border-t border-zinc-150 bg-zinc-50/50 p-5 space-y-4 animate-fade-in text-xs">
                    
                    {/* Header tools inside */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-150 pb-3">
                      <div>
                        <p className="font-extrabold uppercase text-xs text-zinc-900 flex items-center">
                          <Layers className="w-4 h-4 mr-1.5 text-zinc-400" /> Audit Log Stories Backlog Grid
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium">Record metrics logs for historical triage</p>
                      </div>

                      <button
                        onClick={() => handleExportHistoryCSV(sync)}
                        className="px-3.5 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 font-semibold uppercase tracking-wider text-[10px] cursor-pointer flex items-center space-x-1 duration-150 active:translate-y-[1px]"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export Run CSV</span>
                      </button>
                    </div>

                    {/* Stories nested table map */}
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-450 tracking-wide">
                            <th className="p-3">Title</th>
                            <th className="p-3">Feature ID</th>
                            <th className="p-3">Assigned Developer</th>
                            <th className="p-3">ADO Workitem ID</th>
                            <th className="p-3">Status Badge</th>
                            <th className="p-3">ADO Redirect link</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {sync.stories.map((story, sIndex) => {
                            const isRunSuccess = story.status === 'Published';
                            return (
                              <tr key={`${story.id || 'story'}-${sIndex}`} className="hover:bg-zinc-50/60 font-medium">
                                <td className="p-3 max-w-xs truncate font-bold text-zinc-900 uppercase" title={story.title}>
                                  {story.title}
                                </td>
                                <td className="p-3 font-mono text-zinc-500">
                                  {story.featureId || <span className="text-zinc-400">-</span>}
                                </td>
                                <td className="p-3 text-zinc-700 font-semibold">{story.assignedUser}</td>
                                <td className="p-3 font-mono font-bold text-zinc-900">
                                  {story.azureWorkItemId || <span className="text-zinc-400 italic">None</span>}
                                </td>
                                <td className="p-3">
                                  {isRunSuccess ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded text-[9px] font-extrabold uppercase">Success</span>
                                  ) : story.status === 'Failed' ? (
                                    <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-100 rounded text-[9px] font-extrabold uppercase">Failed</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded text-[9px] font-extrabold uppercase font-bold">Skipped</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {isRunSuccess && story.azureWorkItemId ? (
                                    <a
                                      href={`https://dev.azure.com/${sync.orgName}/${sync.projectName}/_workitems/edit/${story.azureWorkItemId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="text-blue-600 hover:underline flex items-center font-extrabold font-sans text-[10px] uppercase"
                                    >
                                      <span>Open</span>
                                      <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                  ) : story.errorMessage ? (
                                    <span className="text-red-500 font-medium font-sans truncate block max-w-xs" title={story.errorMessage}>
                                      {story.errorMessage}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400 italic font-semibold">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
