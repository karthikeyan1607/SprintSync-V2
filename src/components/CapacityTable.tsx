/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper 
} from '@tanstack/react-table';
import { 
  Download, 
  Plus, 
  Trash2, 
  Copy, 
  Edit, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X,
  PlusCircle,
  FolderSync
} from 'lucide-react';
import { ResourceCapacity, SprintStory } from '../types';
import { useCapacityStore } from '../store/useCapacityStore';

interface CapacityTableProps {
  capacities: ResourceCapacity[];
  stories: SprintStory[];
  onUpdateCapacity: (name: string, newVal: number) => void;
  onUpdateStory: (id: string, updatedFields: Partial<SprintStory>) => void;
  onDeleteStory: (id: string) => void;
  onAddStory: (newStory: Omit<SprintStory, 'id'>) => void;
}

interface TableRowData {
  resourceName: string;
  capacity: number;
  allocated: number;
  remaining: number;
  percent: number;
  status: 'Balanced' | 'Underallocated' | 'Overallocated';
}

export default function CapacityTable({
  capacities,
  stories,
  onUpdateCapacity,
  onUpdateStory,
  onDeleteStory,
  onAddStory,
}: CapacityTableProps) {
  const { searchTerm, statusFilter } = useCapacityStore();
  
  // Track open detail row
  const [expandedResource, setExpandedResource] = useState<string | null>(null);

  // Quick state for inline capacity edits
  const [editingCapacityResource, setEditingCapacityResource] = useState<string | null>(null);
  const [tempCapacityVal, setTempCapacityVal] = useState<string>('');

  // Dialog / form state for Adding a story
  const [isAddingStoryFor, setIsAddingStoryFor] = useState<string | null>(null);
  const [newStoryForm, setNewStoryForm] = useState({
    title: '',
    domain: 'CUOB',
    points: 1.0,
    featureId: '',
    activity: 'SIT Validation',
    workType: 'User Story' as 'Feature' | 'Epic' | 'Bug' | 'User Story' | 'Task',
  });

  // Dialog / form state for Editing a story
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editStoryForm, setEditStoryForm] = useState({
    title: '',
    domain: 'CUOB',
    points: 1.5,
    featureId: '',
    activity: 'SIT Validation',
    workType: 'User Story' as 'Feature' | 'Epic' | 'Bug' | 'User Story' | 'Task',
  });

  // 1. Calculate allocated points per resource
  const resourceAllocatedPoints: Record<string, number> = {};
  stories.forEach((story) => {
    const name = story.resourceName.toLowerCase();
    if (name !== 'unassigned') {
      resourceAllocatedPoints[name] = (resourceAllocatedPoints[name] || 0) + story.points;
    }
  });

  // 2. Prepare table row structures
  const tableData: TableRowData[] = capacities.map((cap) => {
    const allocated = Number((resourceAllocatedPoints[cap.resourceName.toLowerCase()] || 0).toFixed(2));
    const remaining = Number((cap.capacity - allocated).toFixed(2));
    const percent = cap.capacity > 0 ? (allocated / cap.capacity) * 100 : 0;
    
    let status: 'Balanced' | 'Underallocated' | 'Overallocated' = 'Underallocated';
    if (allocated === cap.capacity) {
      status = 'Balanced';
    } else if (allocated > cap.capacity) {
      status = 'Overallocated';
    }

    return {
      resourceName: cap.resourceName,
      capacity: cap.capacity,
      allocated,
      remaining,
      percent,
      status,
    };
  });

  // 3. Filter Table rows using search term and status tab filters
  const filteredData = tableData.filter((row) => {
    const matchesSearch = row.resourceName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && row.status === statusFilter;
  });

  // 4. TanStack Column Helper & Columns definitions
  const columnHelper = createColumnHelper<TableRowData>();
  
  const columns = [
    columnHelper.accessor('resourceName', {
      header: 'Resource',
      cell: (info) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center font-bold text-xs uppercase tracking-wider">
            {info.getValue().substring(0, 2)}
          </div>
          <span className="font-bold text-zinc-900 text-xs tracking-tight">
            {info.getValue()}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('capacity', {
      header: 'Capacity (pt)',
      cell: (info) => {
        const resource = info.row.original.resourceName;
        const isEditing = editingCapacityResource === resource;
        
        if (isEditing) {
          return (
            <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                step="0.5"
                min="0"
                value={tempCapacityVal}
                onChange={(e) => setTempCapacityVal(e.target.value)}
                className="w-16 px-1.5 py-1 bg-white border border-zinc-300 rounded text-xs text-zinc-950 font-bold focus:outline-none focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11]"
              />
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(tempCapacityVal);
                  if (!isNaN(val) && val >= 0) {
                    onUpdateCapacity(resource, val);
                  }
                  setEditingCapacityResource(null);
                }}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
              <button
                type="button"
                onClick={() => setEditingCapacityResource(null)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center space-x-1.5">
            <span className="font-mono text-xs text-zinc-850 font-extrabold">{info.getValue().toFixed(1)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingCapacityResource(resource);
                setTempCapacityVal(info.getValue().toString());
              }}
              className="p-1 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded transition-all cursor-pointer opacity-30 hover:opacity-100"
              title="Edit individual velocity capacity"
            >
              <Edit className="w-3 h-3" />
            </button>
          </div>
        );
      },
    }),
    columnHelper.accessor('allocated', {
      header: 'Allocated (pt)',
      cell: (info) => (
        <span className="font-mono text-xs font-black text-zinc-900">
          {info.getValue().toFixed(1)}
        </span>
      ),
    }),
    columnHelper.accessor('remaining', {
      header: 'Remaining (pt)',
      cell: (info) => {
        const val = info.getValue();
        return (
          <span className={`font-mono text-xs font-bold ${val < 0 ? 'text-red-650' : val === 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
            {val.toFixed(1)}
          </span>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const val = info.getValue();
        let classes = '';
        if (val === 'Balanced') {
          classes = 'bg-emerald-50 text-emerald-700 border-emerald-100';
        } else if (val === 'Underallocated') {
          classes = 'bg-amber-50 text-amber-700 border-amber-100';
        } else {
          classes = 'bg-red-50 text-red-700 border-red-100';
        }

        return (
          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase ${classes}`}>
            {val}
          </span>
        );
      },
    }),
    columnHelper.accessor('percent', {
      header: 'Progress',
      cell: (info) => {
        const percent = info.getValue();
        const score = Math.round(percent);
        
        let barColor = 'bg-[#FFCD11]'; // Caterpillar Yellow default (Underallocated < 80%)
        if (percent > 100) {
          barColor = 'bg-red-500'; // Red Overallocated
        } else if (percent === 100) {
          barColor = 'bg-emerald-500'; // Green Balanced
        } else if (percent >= 80 && percent < 100) {
          barColor = 'bg-amber-500'; // Yellow/Amber Underallocated high
        }

        return (
          <div className="flex items-center space-x-3 w-40">
            <div className="w-full bg-zinc-150 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${barColor}`} 
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold font-mono text-zinc-500 min-w-[32px] text-right">
              {score}%
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'expand',
      cell: (info) => {
        const isExp = expandedResource === info.row.original.resourceName;
        return (
          <button
            type="button"
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-black transition-all cursor-pointer"
          >
            {isExp ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Export CSV Data
  const handleExportCSV = () => {
    const headers = ['ResourceName', 'CapacityLimit', 'AllocatedPoints', 'RemainingPoints', 'StatusLabel'];
    const rows = capacities.map((cap) => {
      const allocated = resourceAllocatedPoints[cap.resourceName.toLowerCase()] || 0;
      const remaining = Number((cap.capacity - allocated).toFixed(2));
      let statusString = 'Underallocated';
      if (allocated === cap.capacity) statusString = 'Balanced';
      else if (allocated > cap.capacity) statusString = 'Overallocated';
      
      return [
        `"${cap.resourceName.replace(/"/g, '""')}"`,
        cap.capacity,
        allocated.toFixed(2),
        remaining.toFixed(2),
        statusString,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'SprintSync_Capacity_Validation.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Duplicate a Story Callback
  const handleDuplicateStory = (story: SprintStory) => {
    const { id, ...copiedFields } = story;
    onAddStory({
      ...copiedFields,
      title: `${copiedFields.title} (Copy)`,
    });
  };

  // Stories filtering for detailed expanded block
  const getStoriesForResource = (resource: string) => {
    return stories.filter((s) => s.resourceName.toLowerCase() === resource.toLowerCase());
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Table Action Utilities */}
      <div className="flex justify-between items-center bg-white border border-zinc-200/80 p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div>
          <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">
            Resource Allocation Detail
          </span>
          <h2 className="font-extrabold text-zinc-900 text-xs uppercase tracking-tight mt-0.5">
            Individual Capacity Validation Roster ({filteredData.length} Shown)
          </h2>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center space-x-2 bg-black text-[#FFCD11] hover:bg-neutral-900 border border-black px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Main Table Layer */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-[0_4px_18px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-zinc-150 bg-zinc-50">
                  {group.headers.map((header) => (
                    <th 
                      key={header.id} 
                      className="px-5 py-3 text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-12 text-center text-zinc-400 font-medium text-xs">
                    No matching resources found for current active filter criteria.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const resName = row.original.resourceName;
                  const isExp = expandedResource === resName;
                  const associatedStories = getStoriesForResource(resName);

                  return (
                    <React.Fragment key={row.id}>
                      {/* Interactive Row */}
                      <tr 
                        onClick={() => setExpandedResource(isExp ? null : resName)}
                        className={`border-b border-zinc-100 hover:bg-zinc-50/50 cursor-pointer transition-all ${
                          isExp ? 'bg-zinc-50/70' : ''
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-5 py-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>

                      {/* Expanded Section */}
                      {isExp && (
                        <tr>
                          <td colSpan={columns.length} className="px-5 py-5 bg-zinc-50/40 border-b border-zinc-150">
                            <div className="space-y-4 max-w-full">
                              
                              {/* Header of details */}
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-150 pb-3 gap-3">
                                <div>
                                  <h4 className="font-extrabold text-[#111111] text-[11px] uppercase tracking-wider flex items-center">
                                    <FolderSync className="w-4 h-4 mr-1.5 text-zinc-550" />
                                    Assigned Sprint Scope ({associatedStories.length} Ticket{associatedStories.length === 1 ? '' : 's'})
                                  </h4>
                                  <p className="text-[10.5px] text-zinc-450 font-medium mt-0.5">
                                    Add, edit, delete, or duplicate key user story points allocations allocated to {resName}.
                                  </p>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAddingStoryFor(resName);
                                    setNewStoryForm((prev) => ({ ...prev, title: '' }));
                                  }}
                                  className="inline-flex items-center space-x-1 bg-zinc-100 border border-zinc-250 text-zinc-800 hover:bg-zinc-200 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all shadow-sm cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Assign Story</span>
                                </button>
                              </div>

                              {/* Story list display */}
                              {associatedStories.length === 0 ? (
                                <p id="no-stories-assigned" className="text-xs text-zinc-400 italic py-3">
                                  No current stories are allocated directly to {resName}. Use "Assign Story" tool to load work points.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {associatedStories.map((story, storyIndex) => (
                                    <div 
                                      key={`${story.id || 'story'}-${storyIndex}`} 
                                      className="bg-white border border-zinc-200 p-4 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)] relative space-y-3 flex flex-col justify-between"
                                    >
                                      {/* Story Content View */}
                                      {editingStoryId === story.id ? (
                                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                          <div className="grid grid-cols-1 gap-2">
                                            <input
                                              type="text"
                                              value={editStoryForm.title}
                                              onChange={(e) => setEditStoryForm({ ...editStoryForm, title: e.target.value })}
                                              className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs text-zinc-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#FFCD11] focus:border-[#FFCD11]"
                                              placeholder="Update title..."
                                            />
                                            <div className="grid grid-cols-3 gap-2">
                                              <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-400">Points</label>
                                                <input
                                                  type="number"
                                                  step="0.5"
                                                  value={editStoryForm.points}
                                                  onChange={(e) => setEditStoryForm({ ...editStoryForm, points: parseFloat(e.target.value) || 0.5 })}
                                                  className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-900"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-400">ID</label>
                                                <input
                                                  type="text"
                                                  value={editStoryForm.featureId || ''}
                                                  onChange={(e) => setEditStoryForm({ ...editStoryForm, featureId: e.target.value })}
                                                  className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-900"
                                                  placeholder="Feat ID"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex gap-1.5 justify-end">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                onUpdateStory(story.id, {
                                                  title: editStoryForm.title,
                                                  points: editStoryForm.points,
                                                  domain: editStoryForm.domain,
                                                  featureId: editStoryForm.featureId || undefined,
                                                  workType: editStoryForm.workType,
                                                });
                                                setEditingStoryId(null);
                                              }}
                                              className="bg-black text-[#FFCD11] hover:bg-neutral-900 text-[10px] px-3 py-1 font-bold rounded"
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingStoryId(null)}
                                              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] px-3 py-1 font-bold rounded"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex-1 select-none">
                                          <div className="flex justify-end items-start">
                                            <span className="font-mono text-xs font-black text-zinc-900 bg-[#FFCD11]/20 px-2.5 py-0.5 rounded-full">
                                              {story.points.toFixed(1)} pt
                                            </span>
                                          </div>
                                          <p className="text-xs text-zinc-850 font-bold mt-2 font-sans pr-6 leading-relaxed">
                                            {story.featureId ? `[Feature ${story.featureId}] ` : ''}{story.title}
                                          </p>
                                          <p className="text-[10px] text-zinc-450 font-medium font-mono mt-1 uppercase">
                                            Type: {story.workType} • Activity: {story.activity}
                                          </p>
                                        </div>
                                      )}

                                      {/* Normal mode Action Bar */}
                                      {editingStoryId !== story.id && (
                                        <div className="flex gap-2 justify-end border-t border-zinc-100 pt-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            onClick={() => handleDuplicateStory(story)}
                                            className="p-1 px-2 hover:bg-zinc-100 text-zinc-650 hover:text-black rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                                            title="Duplicate this story details"
                                          >
                                            <Copy className="w-3 h-3" />
                                            <span>Duplicate</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingStoryId(story.id);
                                              setEditStoryForm({
                                                title: story.title,
                                                domain: story.domain,
                                                points: story.points,
                                                featureId: story.featureId || '',
                                                activity: story.activity,
                                                workType: story.workType,
                                              });
                                            }}
                                            className="p-1 px-2 hover:bg-zinc-100 text-zinc-650 hover:text-black rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                                          >
                                            <Edit className="w-3 h-3" />
                                            <span>Edit</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onDeleteStory(story.id)}
                                            className="p-1 px-2 hover:bg-red-50 text-red-500 rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Assign New Story Modal inline container form */}
                              {isAddingStoryFor === resName && (
                                <div 
                                  className="bg-amber-50/50 border border-amber-150 p-5 rounded-2xl space-y-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex justify-between items-center border-b border-amber-150 pb-2">
                                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center">
                                      <PlusCircle className="w-4 h-4 mr-1.5 text-amber-700" />
                                      Create & Assign New Story to {resName}
                                    </h5>
                                    <button 
                                      type="button" 
                                      onClick={() => setIsAddingStoryFor(null)}
                                      className="text-amber-700 hover:text-black hover:bg-amber-100 p-1 rounded-md"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Story Points</label>
                                      <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        value={newStoryForm.points}
                                        onChange={(e) => setNewStoryForm({ ...newStoryForm, points: parseFloat(e.target.value) || 1.0 })}
                                        className="w-full px-2.5 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-extrabold text-zinc-850"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Work Type</label>
                                      <select
                                        value={newStoryForm.workType}
                                        onChange={(e) => setNewStoryForm({ ...newStoryForm, workType: e.target.value as any })}
                                        className="w-full px-2.5 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800"
                                      >
                                        <option value="User Story">User Story (Default)</option>
                                        <option value="Task">Task</option>
                                        <option value="Bug">Bug Report</option>
                                        <option value="Feature">Feature Link</option>
                                        <option value="Epic">Epic Link</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Feature ID (Optional)</label>
                                      <input
                                        type="text"
                                        value={newStoryForm.featureId}
                                        onChange={(e) => setNewStoryForm({ ...newStoryForm, featureId: e.target.value })}
                                        className="w-full px-2.5 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-800"
                                        placeholder="e.g. 2174321"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 block">Story Title (Req.)</label>
                                    <input
                                      type="text"
                                      value={newStoryForm.title}
                                      onChange={(e) => setNewStoryForm({ ...newStoryForm, title: e.target.value })}
                                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#FFCD11]"
                                      placeholder="SIT Validation - DO09 - SIS2GO Access Request..."
                                    />
                                  </div>

                                  <div className="flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!newStoryForm.title.trim()) return;
                                        onAddStory({
                                          ...newStoryForm,
                                          resourceName: resName,
                                        });
                                        setIsAddingStoryFor(null);
                                      }}
                                      className="bg-black text-[#FFCD11] hover:bg-neutral-900 border border-black px-4 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                                    >
                                      Add Story Points
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIsAddingStoryFor(null)}
                                      className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
