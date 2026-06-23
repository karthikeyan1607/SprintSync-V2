/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState
} from '@tanstack/react-table';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Download, 
  Search, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  RotateCcw,
  Clock,
  History
} from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';
import { SyncResultItem } from '../types';

interface ResultsPageProps {
  onResetWorkspace: () => void;
  orgName: string;
  projectName: string;
  onShowHistory?: () => void;
}

export default function ResultsPage({
  onResetWorkspace,
  orgName,
  projectName,
  onShowHistory
}: ResultsPageProps) {
  const {
    syncedItems,
    durationSeconds,
    retryFailed,
    isSyncing,
    currentStatus
  } = useSyncStore();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Calculate metrics
  const total = syncedItems.length;
  const createdCount = syncedItems.filter(i => i.status === 'Published').length;
  const failedCount = syncedItems.filter(i => i.status === 'Failed').length;
  const skippedCount = syncedItems.filter(i => i.status === 'Skipped').length;
  
  const successRate = useMemo(() => {
    const attempted = createdCount + failedCount;
    if (attempted === 0) return 0;
    return Math.round((createdCount / attempted) * 100);
  }, [createdCount, failedCount]);

  // Download export CSV results
  const handleExportCSV = () => {
    const headers = [
      'Title',
      'Feature ID',
      'Assigned User',
      'Work Item ID',
      'Status',
      'Error Message',
      'Created Timestamp'
    ];

    const rows = syncedItems.map(item => [
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
    link.download = `SprintSync_DevOps_Outcome_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // Duration Helper
  const formatDurationRaw = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) {
      return `${m} ${m === 1 ? 'minute' : 'minutes'} ${s} ${s === 1 ? 'second' : 'seconds'}`;
    }
    return `${s} ${s === 1 ? 'second' : 'seconds'}`;
  };

  // Table Columns Definition using TanStack react-table
  const columns = useMemo<ColumnDef<SyncResultItem>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: info => (
        <div className="font-bold text-zinc-900 max-w-sm truncate uppercase tracking-tight" title={info.getValue() as string}>
          {info.getValue() as string}
        </div>
      )
    },
    {
      accessorKey: 'featureId',
      header: 'Feature ID',
      cell: info => {
        const val = info.getValue() as string;
        return val ? (
          <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
            {val}
          </span>
        ) : (
          <span className="text-zinc-400 italic">None</span>
        );
      }
    },
    {
      accessorKey: 'assignedUser',
      header: 'Assigned User',
      cell: info => (
        <span className="font-semibold text-zinc-700 capitalize">
          {info.getValue() as string}
        </span>
      )
    },
    {
      accessorKey: 'azureWorkItemId',
      header: 'Work Item ID',
      cell: info => {
        const val = info.getValue() as string;
        return val ? (
          <span className="font-mono font-black text-black">
            {val}
          </span>
        ) : (
          <span className="text-zinc-400 italic">None</span>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: info => {
        const status = info.getValue() as string;
        if (status === 'Published') {
          return (
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-extrabold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Success</span>
            </span>
          );
        } else if (status === 'Failed') {
          return (
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded text-[10px] font-extrabold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>Failed</span>
            </span>
          );
        } else {
          return (
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-yellow-50 text-yellow-800 border border-yellow-250 rounded text-[10px] font-extrabold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span>Skipped</span>
            </span>
          );
        }
      }
    },
    {
      accessorKey: 'createdDate',
      header: 'Created Date',
      cell: info => {
        const val = info.getValue() as string;
        return (
          <span className="font-mono text-[10px] text-zinc-500 font-semibold">
            {new Date(val).toLocaleTimeString()}
          </span>
        );
      }
    },
    {
      accessorKey: 'errorMessage',
      header: 'Error Message',
      cell: info => {
        const val = info.getValue() as string;
        return val ? (
          <span className="text-red-650 font-medium leading-relaxed font-sans text-[11px] block max-w-xs truncate" title={val}>
            {val}
          </span>
        ) : (
          <span className="text-zinc-400 italic">-</span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Work Item Link',
      cell: ({ row }) => {
        const item = row.original;
        if (item.status === 'Published' && item.azureWorkItemId) {
          const url = `https://dev.azure.com/${orgName}/${projectName}/_workitems/edit/${item.azureWorkItemId}`;
          return (
            <a
              href={url}
              target="_blank"
              referrerPolicy="no-referrer"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[10px] font-extrabold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
            >
              <span className="mr-1">Open in ADO</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          );
        }
        return <span className="text-zinc-400 italic font-semibold text-[10px]">UNAVAILABLE</span>;
      }
    }
  ], [orgName, projectName]);

  const table = useReactTable({
    data: syncedItems,
    columns,
    state: {
      sorting,
      globalFilter
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* 1. TOP HEADER & MAIN HERO */}
      <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-950 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>SprintSync Results</span>
          </div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
            DevOps Pipeline Execution Results
          </h2>
          <p className="text-xs text-zinc-500 max-w-3xl">
            Success Rate: <strong className="text-zinc-800">{successRate}%</strong> • Duration: <strong className="text-zinc-800">{formatDurationRaw(durationSeconds)}</strong> • Target Workspace area-path maps resolved cleanly.
          </p>
        </div>

        {/* Global Control utilities */}
        <div className="flex flex-wrap items-center gap-3">
          {onShowHistory && (
            <button
              onClick={onShowHistory}
              className="px-4 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs font-extrabold uppercase rounded-xl transition flex items-center space-x-2 cursor-pointer active:scale-95 duration-150"
            >
              <History className="w-4 h-4 text-zinc-400" />
              <span>Search Audit Logs</span>
            </button>
          )}

          <button
            onClick={onResetWorkspace}
            className="px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-250 text-zinc-750 text-xs font-extrabold uppercase rounded-xl transition flex items-center space-x-2 cursor-pointer active:scale-95 duration-150 animate-fade-in"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clean Dashboard</span>
          </button>
        </div>
      </div>

      {/* 2. RESULTS SUMMARY CARDS CONTAINER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Created (Success) */}
        <div className="bg-white border border-zinc-220 p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-32">
          <div className="absolute top-0 inset-l-0 w-1.5 h-full bg-emerald-500" />
          <div className="pl-2">
            <p className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">Created</p>
            <p className="text-4xl font-extrabold text-emerald-600 mt-3 font-mono">{createdCount}</p>
          </div>
          <div className="pl-2 text-[9px] font-bold text-emerald-600 flex items-center space-x-1 uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Published Successfully</span>
          </div>
        </div>

        {/* Card 2: Failed */}
        <div className="bg-white border border-zinc-220 p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-32">
          <div className="absolute top-0 inset-l-0 w-1.5 h-full bg-red-500" />
          <div className="pl-2">
            <p className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">Failed</p>
            <p className="text-4xl font-extrabold text-red-650 mt-3 font-mono">{failedCount}</p>
          </div>
          <div className="pl-2 text-[9px] font-bold text-red-650 flex items-center space-x-1 uppercase">
            <XCircle className="w-3.5 h-3.5" />
            <span>Errors Requiring Triage</span>
          </div>
        </div>

        {/* Card 3: Skipped */}
        <div className="bg-white border border-zinc-220 p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-32">
          <div className="absolute top-0 inset-l-0 w-1.5 h-full bg-amber-500" />
          <div className="pl-2">
            <p className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">Skipped</p>
            <p className="text-4xl font-extrabold text-amber-600 mt-3 font-mono">{skippedCount}</p>
          </div>
          <div className="pl-2 text-[9px] font-bold text-amber-600 flex items-center space-x-1 uppercase">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Exclusions / Cancelled</span>
          </div>
        </div>

        {/* Card 4: Success Rate */}
        <div className={`bg-white border border-zinc-220 p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between h-32`}>
          <div className="absolute top-0 inset-l-0 w-1.5 h-full bg-[#FFCD11]" />
          <div className="pl-2">
            <p className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">Success Rate</p>
            <p className="text-4xl font-extrabold text-zinc-900 mt-3 font-mono">{successRate}%</p>
          </div>
          <div className="pl-2 text-[9px] font-bold text-[#b08b00] flex items-center space-x-1 uppercase">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Pipeline Metric Ratio</span>
          </div>
        </div>
      </div>

      {/* 3. RETRY & EXPORT CONTROLLERS BLOCK */}
      <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm text-zinc-900 uppercase">Operational Work-Item Control</h3>
          <p className="text-xs text-zinc-400">Allows downloading complete results payload or selectively retrying failed handshakes without doubling successful records.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Retry Failed Stories */}
          <button
            onClick={() => retryFailed(orgName, projectName)}
            disabled={failedCount === 0 || isSyncing}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all duration-200 flex items-center space-x-2 ${
              failedCount === 0 || isSyncing
                ? 'bg-zinc-50 border border-zinc-250 text-zinc-400 cursor-not-allowed shadow-none'
                : 'bg-black text-[#FFCD11] hover:bg-zinc-950 hover:text-white border border-black cursor-pointer active:scale-95'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 text-[#FFCD11]" />
            )}
            <span>Retry Failed Stories</span>
          </button>

          {/* Export Results */}
          <button
            onClick={handleExportCSV}
            disabled={total === 0 || isSyncing}
            className={`px-5 py-2.5 border font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition flex items-center space-x-2 ${
              total === 0 || isSyncing
                ? 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                : 'bg-white border-zinc-250 hover:border-black text-zinc-800 cursor-pointer active:scale-95 hover:bg-zinc-50'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV Results</span>
          </button>
        </div>
      </div>

      {/* 4. RESULTS DATA TABLE */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.03)] overflow-hidden">
        
        {/* Table Search Filtering and Controls */}
        <div className="p-5 border-b border-zinc-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search results feed..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-220 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-black leading-none"
            />
          </div>

          <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">
            Showing {table.getRowModel().rows.length} of {total} synchronized records
          </div>
        </div>

        {/* Core TanStack Table Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-zinc-50 border-b border-zinc-200">
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="p-4 text-[10px] font-black text-zinc-450 uppercase tracking-wider border-b border-zinc-200 cursor-pointer select-none hover:text-black"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        <span>
                          {{
                            asc: ' ▴',
                            desc: ' ▾',
                          }[header.column.getIsSorted() as string] ?? ''}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center text-zinc-400">
                    <div className="space-y-2">
                      <XCircle className="w-10 h-10 mx-auto text-zinc-300 animate-pulse" />
                      <p className="font-extrabold uppercase text-xs text-zinc-700">No Synchronized Items Match Filter</p>
                      <p className="text-[10px]">Verify your search criteria or review the input dataset again.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-50/70 transition-colors"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Console */}
        {table.getPageCount() > 1 && (
          <div className="p-4 bg-zinc-50/50 border-t border-zinc-200 flex items-center justify-between text-xs font-semibold text-zinc-650 font-mono text-[11px]">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1 px-3 border border-zinc-200 bg-white rounded hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1 px-3 border border-zinc-200 bg-white rounded hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
