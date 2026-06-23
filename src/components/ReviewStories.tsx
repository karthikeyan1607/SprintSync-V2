/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Copy, AlertTriangle, Check, CheckCircle2, AlertCircle, X, HelpCircle, Edit3, Settings, Grid, Minimize2 } from 'lucide-react';
import { SprintStory, ResourceCapacity, Resource } from '../types';
import { useToastStore } from '../store/useToastStore';
import { isResourceInRegion } from '../utils/resourceResolver';

interface ReviewStoriesProps {
  stories: SprintStory[];
  capacities: ResourceCapacity[];
  domains: string[];
  resources: string[];
  csvResources: Resource[];
  onUpdateStory: (id: string, updated: Partial<SprintStory>) => void;
  onDeleteStory: (id: string) => void;
  onAddStory: (story: Omit<SprintStory, 'id'>) => void;
  onProceed: () => void;
  managerRegion: string;
  selectedRegionFilter: string;
  setSelectedRegionFilter: (val: string) => void;
  selectedDomain: string;
  setSelectedDomain: (val: string) => void;
}

export default function ReviewStories({
  stories,
  capacities,
  domains,
  resources,
  csvResources,
  onUpdateStory,
  onDeleteStory,
  onAddStory,
  onProceed,
  managerRegion,
  selectedRegionFilter,
  setSelectedRegionFilter,
  selectedDomain,
  setSelectedDomain,
}: ReviewStoriesProps) {
  // 1. Search, Region and Domain Filters
  const [searchTerm, setSearchTerm] = useState('');
  
  // Multi-select bulk edit state
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [bulkResource, setBulkResource] = useState('');
  const [bulkPoints, setBulkPoints] = useState('');
  const [bulkDomain, setBulkDomain] = useState('');
  const [bulkWorkType, setBulkWorkType] = useState('');

  // Manual ignore duplicate registry
  const [ignoredDuplicateKeys, setIgnoredDuplicateKeys] = useState<string[]>([]);

  // Inline/cell editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<Partial<SprintStory>>({});

  // Dialog/Modal States
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Story Form State
  const [newStory, setNewStory] = useState({
    title: '',
    resourceName: 'Unassigned',
    points: 1,
    featureId: '',
    domain: domains[0] || 'CUOB',
    activity: 'Automation',
    workType: 'User Story' as 'Feature' | 'Epic' | 'Task' | 'Bug' | 'User Story',
  });

  // Filter CSV resources roster based on selected region filter (supporting ALL)
  const filteredCsvResources = useMemo(() => {
    if (selectedRegionFilter === 'ALL') {
      return csvResources;
    }
    // Match against target region
    return csvResources.filter(r => {
      const reg = r.region || 'India';
      // Match regional options exactly or fuzzy
      if (selectedRegionFilter.toUpperCase() === 'US') {
        return ['us', 'usa', 'united states'].includes(reg.toLowerCase().trim());
      }
      return reg.toLowerCase().trim() === selectedRegionFilter.toLowerCase().trim();
    });
  }, [csvResources, selectedRegionFilter]);

  // Handle inline edits
  const handleStartEdit = (story: SprintStory) => {
    setEditingRowId(story.id);
    setEditedFields({ ...story });
  };

  const handleSaveInline = (id: string) => {
    const fieldsToSave = { ...editedFields };
    // If resource changed, automatically fetch correct confidence score and assign email
    if (fieldsToSave.resourceName) {
      if (fieldsToSave.resourceName === 'Unassigned') {
        fieldsToSave.email = '';
        fieldsToSave.confidence = 100;
        fieldsToSave.parsingMethod = 'Manual Reset';
      } else {
        const found = csvResources.find(r => r.displayName === fieldsToSave.resourceName);
        if (found) {
          fieldsToSave.email = found.email;
          fieldsToSave.confidence = 100;
          fieldsToSave.parsingMethod = 'Manual Assignment';
        }
      }
    }
    onUpdateStory(id, fieldsToSave);
    setEditingRowId(null);
    setEditedFields({});
    useToastStore.getState().addToast('Story updated successfully.', 'success');
  };

  const handleCancelInline = () => {
    setEditingRowId(null);
    setEditedFields({});
  };

  // Duplicate a story
  const handleDuplicate = (story: SprintStory) => {
    const { id, status, validationMessages, ...clonable } = story;
    const clonedTitle = story.title.endsWith('(Copy)') ? story.title : `${story.title} (Copy)`;
    onAddStory({
      ...clonable,
      title: clonedTitle,
    });
  };

  // Filtered stories list strictly conforming to region isolation and extended query
  const filteredStories = useMemo(() => {
    return stories.filter(story => {
      // Region Filter supporting ALL and direct region match
      let matchesRegion = true;
      if (selectedRegionFilter !== 'ALL') {
        const resourceRegionMatches = isResourceInRegion(story.resourceName, selectedRegionFilter, csvResources);
        const storyRegionMatches = (story.region || '').toUpperCase() === selectedRegionFilter.toUpperCase();
        matchesRegion = resourceRegionMatches || storyRegionMatches;
      }
      if (!matchesRegion) return false;

      // Search indexing support: Title, Feature ID, Resource/Assignee, Email, Domain, WorkType
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        story.title.toLowerCase().includes(searchLower) ||
        story.resourceName.toLowerCase().includes(searchLower) ||
        (story.email || '').toLowerCase().includes(searchLower) ||
        (story.featureId || '').toLowerCase().includes(searchLower) ||
        (story.domain || '').toLowerCase().includes(searchLower) ||
        (story.workType || '').toLowerCase().includes(searchLower);

      // Domain Filter
      const matchesDomain = selectedDomain === 'ALL' || story.domain === selectedDomain;

      return matchesSearch && matchesDomain;
    });
  }, [stories, searchTerm, selectedDomain, selectedRegionFilter, csvResources]);

  // UNKNOWN / INVALID RESOURCES (Within the stories)
  const unknownResourcesList = useMemo(() => {
    const uniques = new Set<string>();
    stories.forEach(s => {
      if (s.resourceName && s.resourceName !== 'Unassigned') {
        const found = csvResources.some(
          cr => cr.displayName.toLowerCase() === s.resourceName.toLowerCase()
        );
        if (!found) {
          uniques.add(s.resourceName);
        }
      }
    });
    return Array.from(uniques);
  }, [stories, csvResources]);

  // DUPLICATE STORY DETECTION ENGINE
  // Duplicates are calculated based on sharing the same: Feature ID, Title, and Assignee (excluding Unassigned)
  const duplicateStoriesGroups = useMemo(() => {
    const groups: { [key: string]: SprintStory[] } = {};
    
    // Group only within the region's filtered stories
    filteredStories.forEach(story => {
      if (!story.title || story.resourceName === 'Unassigned') return;
      const key = `${story.featureId || ''}::${story.title.toLowerCase().trim()}::${story.resourceName.toLowerCase().trim()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(story);
    });

    return Object.entries(groups)
      .filter(([key, list]) => list.length > 1 && !ignoredDuplicateKeys.includes(key))
      .map(([key, list]) => ({ key, list }));
  }, [filteredStories, ignoredDuplicateKeys]);

  const getStoryStatus = (story: SprintStory) => {
    const isBlocked = !story.resourceName || story.resourceName === 'Unassigned' || !story.title || story.points <= 0;
    if (isBlocked) return 'BLOCKED';

    // Find expected allocation
    const cap = capacities.find(c => c.resourceName.toLowerCase().trim() === story.resourceName.toLowerCase().trim());
    const expected = cap ? cap.capacity : 5.0; // Fallback to 5.0 as default expected capacity

    // Find allocated points for this resource in current stories
    const allocated = stories
      .filter(s => s.resourceName.toLowerCase().trim() === story.resourceName.toLowerCase().trim())
      .reduce((sum, s) => sum + s.points, 0);

    if (Math.abs(allocated - expected) > 0.01) {
      return 'WARNING';
    }

    return 'READY';
  };

  // Merging duplicate stories: Sum up points of subsequent ones and merge them into the first, deleting the extras
  const handleMergeDuplicates = (groupKey: string, list: SprintStory[]) => {
    const target = list[0];
    const duplicates = list.slice(1);
    const sumPoints = list.reduce((sum, s) => sum + (s.points || 0), 0);

    // Update first item with summed points
    onUpdateStory(target.id, { points: sumPoints });
    
    // Delete duplicate copies
    duplicates.forEach(d => onDeleteStory(d.id));

    useToastStore.getState().addToast(`Merged ${list.length} duplicate items into a single ${sumPoints}pt User Story successfully!`, 'success');
  };

  const handleDeleteDuplicates = (list: SprintStory[]) => {
    const duplicates = list.slice(1);
    duplicates.forEach(d => onDeleteStory(d.id));
    useToastStore.getState().addToast(`Purged extra duplicate story entries.`, 'info');
  };

  // MULTI-SELECT CHECKBOX SYSTEM
  const handleSelectAllCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStoryIds(filteredStories.map(s => s.id));
    } else {
      setSelectedStoryIds([]);
    }
  };

  const handleSelectRowCheckbox = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStoryIds(prev => [...prev, id]);
    } else {
      setSelectedStoryIds(prev => prev.filter(item => item !== id));
    }
  };

  // BULK OPERATIONS DISPATCH
  const handleApplyBulkEdits = () => {
    if (selectedStoryIds.length === 0) {
      useToastStore.getState().addToast('Please select stories for bulk actions.', 'warning');
      return;
    }

    selectedStoryIds.forEach(id => {
      const updates: Partial<SprintStory> = {};
      
      if (bulkResource) {
        if (bulkResource === 'Unassigned') {
          updates.resourceName = 'Unassigned';
          updates.email = '';
          updates.confidence = 100;
        } else {
          const profile = csvResources.find(r => r.displayName === bulkResource);
          if (profile) {
            updates.resourceName = profile.displayName;
            updates.email = profile.email;
            updates.confidence = 100;
          }
        }
      }

      if (bulkPoints) {
        updates.points = parseFloat(bulkPoints) || 0;
      }

      if (bulkDomain) {
        updates.domain = bulkDomain;
      }

      if (bulkWorkType) {
        updates.workType = bulkWorkType as any;
      }

      onUpdateStory(id, updates);
    });

    useToastStore.getState().addToast(`Bulk edited ${selectedStoryIds.length} stories successfully.`, 'success');
    setSelectedStoryIds([]);
    setBulkResource('');
    setBulkPoints('');
    setBulkDomain('');
    setBulkWorkType('');
  };

  // Submit new story
  const handleAddStorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStory.title.trim()) return;

    const alignedEmail = csvResources.find(r => r.displayName.toLowerCase() === newStory.resourceName.toLowerCase())?.email || '';

    onAddStory({
      title: newStory.title.trim(),
      resourceName: newStory.resourceName,
      email: alignedEmail,
      points: Number(newStory.points) || 1,
      featureId: newStory.featureId.trim() || undefined,
      domain: newStory.domain,
      activity: 'Automation',
      workType: newStory.workType as any,
      areaPath: `SprintSync\\${newStory.domain}`,
      iterationPath: `SprintSync\\Iteration`,
      confidence: 100,
      parsingMethod: 'Manual UI Creation'
    });

    setNewStory({
      title: '',
      resourceName: 'Unassigned',
      points: 1,
      featureId: '',
      domain: domains[0] || 'CUOB',
      activity: 'Automation',
      workType: 'User Story',
    });
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-black animate-fade-in pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Step 02 — Work Item Allocation</span>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
            Sprint Stories
          </h1>
          <p className="text-zinc-500 text-xs font-semibold">
            Audit parse results, resolve unknown resources, check duplication, or make bulk spreadsheet-level assignments.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-[#FFCD11] text-black font-extrabold text-xs uppercase rounded-xl hover:bg-yellow-400 transition-all cursor-pointer shadow-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4 text-black font-black stroke-[3]" />
            <span>Add Story</span>
          </button>

          <button
            type="button"
            onClick={onProceed}
            className="px-4 py-2.5 bg-black text-[#FFCD11] font-bold text-xs uppercase rounded-xl hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
          >
            <span>Proceed to Allocation Health Check</span>
          </button>
        </div>
      </div>

      {/* ⚠️ SECTION A: LIGHTWEIGHT RESOURCE VALIDATION PANEL */}
      {unknownResourcesList.length > 0 && (
        <div className="bg-white border-2 border-red-200 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-red-705">
            <AlertCircle className="w-5 h-5 text-red-650" />
            <span className="text-sm font-black uppercase tracking-wider">
              Resource Validation — Unknown Resources Found
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-normal font-semibold">
            The following parsed resource names do not exist in the Resource Master roster.
            Please use the dropdown to assign them to existing active directory profiles.
          </p>

          <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-red-50 text-red-800 uppercase text-[9px] font-black tracking-wider border-b border-red-100">
                    <th className="p-3 px-4">Unknown Resource Name</th>
                    <th className="p-3 px-4">Status</th>
                    <th className="p-3 px-4">Assign To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-semibold text-xs text-zinc-800">
                  {unknownResourcesList.map((resourceName) => {
                    return (
                      <tr key={resourceName} className="hover:bg-red-50/10">
                        <td className="p-3 px-4 font-bold text-red-600 truncate max-w-[150px]" title={resourceName}>
                          "{resourceName}"
                        </td>
                        <td className="p-3 px-4 text-red-700 font-extrabold uppercase text-[10px]">
                          ⚠️ Unknown Resource
                        </td>
                        <td className="p-3 px-4">
                          <select
                            onChange={(e) => {
                              const targetName = e.target.value;
                              if (!targetName) return;
                              const profile = csvResources.find(r => r.displayName === targetName);
                              if (profile) {
                                // Update all stories having this resource name to the aligned displayName and email
                                stories.forEach(story => {
                                  if (story.resourceName.toLowerCase() === resourceName.toLowerCase()) {
                                    onUpdateStory(story.id, {
                                      resourceName: profile.displayName,
                                      email: profile.email
                                    });
                                  }
                                });
                                useToastStore.getState().addToast(`Reassigned "${resourceName}" to "${profile.displayName}"`, 'success');
                              }
                            }}
                            value=""
                            className="p-1 px-2 border border-zinc-200 bg-zinc-50 rounded text-xs leading-tight min-w-[200px] focus:outline-none"
                          >
                            <option value="">-- Assign To --</option>
                            {filteredCsvResources.map(r => (
                              <option key={r.email} value={r.displayName}>{r.displayName} ({r.email})</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ SECTION B: DUPLICATE STORY DETECTION PANEL */}
      {duplicateStoriesGroups.length > 0 && (
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-5 space-y-4 shadow-sm animate-pulse-once">
          <div className="flex items-center space-x-2 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-black uppercase tracking-wider">
              Discovered Duplicate Stories ({duplicateStoriesGroups.length})
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-semibold leading-normal">
            Multiple items share the exact same Feature, Title, and Assignee. Select whether to Keep, Merge (combining values/points), or Delete duplicates.
          </p>

          <div className="space-y-2.5">
            {duplicateStoriesGroups.map((group, groupIdx) => {
              const [first] = group.list;
              const totalPointsGroup = group.list.reduce((sum, s) => sum + (s.points || 0), 0);

              return (
                <div key={`${group.key}-${groupIdx}`} className="p-3 px-4 bg-amber-50 border border-amber-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-900 tracking-tight block">Assignee: {first.resourceName}</span>
                    <p className="font-bold text-zinc-900 mt-1">"{first.title}"</p>
                    <span className="text-zinc-500 font-semibold mt-0.5 block">Shared by {group.list.length} records. Cumulative weight is {totalPointsGroup}pt.</span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleMergeDuplicates(group.key, group.list)}
                      className="px-3 py-1.5 bg-black text-[#FFCD11] hover:bg-zinc-900 text-[10px] font-black uppercase tracking-wide rounded-lg cursor-pointer shadow-sm"
                    >
                      Merge (Sum points)
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete historical duplicate clones?')) {
                          handleDeleteDuplicates(group.list);
                        }
                      }}
                      className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-bold uppercase tracking-wide rounded-lg border border-red-100 cursor-pointer"
                    >
                      Delete duplicates
                    </button>
                    <button
                      onClick={() => setIgnoredDuplicateKeys([...ignoredDuplicateKeys, group.key])}
                      className="px-3 py-1.5 bg-white border border-amber-200 text-zinc-600 hover:bg-zinc-100 text-[10px] font-bold uppercase tracking-wide rounded-lg cursor-pointer"
                    >
                      Keep separate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER & CONTROL BAR */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Title, Resource, Email, WorkType..."
              className="w-full pl-9.5 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-black focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="text-right text-xs font-bold text-zinc-450 uppercase tracking-wider flex-shrink-0">
          Showing: <strong id="stories-filtered-count-display" className="text-black font-black">{filteredStories.length} of {stories.length} stories</strong>
        </div>
      </div>

      {/* ⚡ BULK SPREADSHEET EDIT BAR (Triggers only when rows are selected) */}
      {selectedStoryIds.length > 0 && (
        <div className="bg-[#FFCD11]/10 border-2 border-[#FFCD11] p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-xs font-bold shadow-sm justify-between w-full">
          <div className="flex items-center space-x-2 text-zinc-850">
            <span className="w-5 h-5 rounded-md flex items-center justify-center font-black bg-black text-[#FFCD11] text-[10px]">
              {selectedStoryIds.length}
            </span>
            <span>Items Selected for Bulk Action</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Bulk Resource Assignee */}
            <select
              value={bulkResource}
              onChange={(e) => setBulkResource(e.target.value)}
              className="p-2.5 border border-zinc-200 bg-white rounded-xl text-xs font-bold w-40 focus:outline-none"
            >
              <option value="">-- Assignee --</option>
              <option value="Unassigned">Unassigned (Clear)</option>
              {filteredCsvResources.map(r => (
                <option key={r.email} value={r.displayName}>{r.displayName}</option>
              ))}
            </select>

            {/* Bulk Points */}
            <input
              type="number"
              step="0.5"
              placeholder="Points (pt)"
              value={bulkPoints}
              onChange={(e) => setBulkPoints(e.target.value)}
              className="p-2.5 border border-zinc-200 bg-white rounded-xl text-xs font-bold w-24 focus:outline-none"
            />

            {/* Bulk Work Type */}
            <select
              value={bulkWorkType}
              onChange={(e) => setBulkWorkType(e.target.value)}
              className="p-2.5 border border-zinc-200 bg-white rounded-xl text-xs font-bold w-32 focus:outline-none"
            >
              <option value="">-- Work Type --</option>
              <option value="User Story">User Story</option>
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
              <option value="Feature">Feature</option>
              <option value="Epic">Epic</option>
            </select>

            <button
              onClick={handleApplyBulkEdits}
              className="py-2.5 px-4 bg-black text-[#FFCD11] hover:bg-zinc-800 rounded-xl uppercase tracking-wider font-extrabold text-[10px] shrink-0 cursor-pointer transition-colors"
            >
              Apply Updates
            </button>

            <button
              onClick={() => setSelectedStoryIds([])}
              className="p-2 text-zinc-550 hover:text-black hover:bg-zinc-100 rounded-lg cursor-pointer"
              title="Clear Selections"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* DIRECT EXCEL STYLE TABLE */}
      <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse divide-y divide-zinc-200">
            <thead>
              <tr className="bg-zinc-950 text-[#FFCD11] text-[10px] font-black uppercase tracking-widest border-b border-zinc-850">
                <th className="py-4 px-4 w-[50px] text-center">
                  <input
                    type="checkbox"
                    checked={filteredStories.length > 0 && selectedStoryIds.length === filteredStories.length}
                    onChange={handleSelectAllCheckbox}
                    className="rounded border-zinc-400 text-black focus:ring-black"
                  />
                </th>
                <th className="py-4 px-4 w-[160px]">Resource / Assignee</th>
                <th className="py-4 px-4 w-[180px]">Email</th>
                <th className="py-4 px-4 w-[110px]">Feature ID</th>
                <th className="py-4 px-4">Title</th>
                <th className="py-4 px-4 w-[90px] text-center">Weight</th>
                <th className="py-4 px-4 w-[110px] text-center">Validation</th>
                <th className="py-4 px-4 w-[120px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white text-zinc-805 font-semibold text-xs">
              {filteredStories.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-zinc-550">
                    {stories.length > 0 ? (
                      <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
                        <AlertCircle className="w-10 h-10 text-zinc-300 stroke-[1.5]" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-sm text-zinc-950 uppercase tracking-wide">
                            No stories match your current filters
                          </p>
                          <p className="text-[11px] text-zinc-500 font-medium">
                            Currently showing <span className="font-bold text-black">0</span> out of <span className="font-bold text-black">{stories.length}</span> stories.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                          }}
                          className="px-4 py-2 bg-black text-[#FFCD11] hover:bg-zinc-800 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold uppercase text-zinc-400 tracking-wider">
                        No backlog stories loaded. Paste text to import.
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredStories.map((story, storyIdx) => {
                  const isEditing = editingRowId === story.id;
                  const isChecked = selectedStoryIds.includes(story.id);
                  
                  // Extract regional alignment
                  let workerRegion = 'India';
                  const matchProf = csvResources.find(r => r.displayName.toLowerCase() === story.resourceName.toLowerCase());
                  if (matchProf && matchProf.region) {
                    workerRegion = matchProf.region;
                  }

                  return (
                    <tr key={`${story.id}-${storyIdx}`} className={`hover:bg-zinc-50/50 transition-colors ${isChecked ? 'bg-[#FFCD11]/5' : ''}`}>
                      {/* ROW SELECT CHECKBOX */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRowCheckbox(story.id, e.target.checked)}
                          className="rounded border-zinc-200 text-black focus:ring-black"
                        />
                      </td>

                      {/* RESOURCE / ASSIGNEE */}
                      <td className="py-3 px-4 font-bold">
                        {isEditing ? (
                          <select
                            value={editedFields.resourceName || 'Unassigned'}
                            onChange={(e) => {
                              const alias = e.target.value;
                              const alignedEmail = filteredCsvResources.find(r => r.displayName === alias)?.email || '';
                              setEditedFields({
                                ...editedFields,
                                resourceName: alias,
                                email: alignedEmail,
                              });
                            }}
                            className="p-1.5 border border-zinc-200 rounded bg-white text-xs font-bold w-full focus:outline-none"
                          >
                            <option value="Unassigned">Unassigned</option>
                            {filteredCsvResources.map(r => (
                              <option key={r.email} value={r.displayName}>{r.displayName}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`${story.resourceName === 'Unassigned' ? 'text-red-500 font-extrabold' : 'text-zinc-900 font-bold'}`}>
                            {story.resourceName}
                          </span>
                        )}
                      </td>

                      {/* EMAIL */}
                      <td className="py-3 px-4 font-mono text-[10px] text-zinc-450 truncate" title={story.email}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedFields.email || ''}
                            onChange={(e) => setEditedFields({ ...editedFields, email: e.target.value })}
                            className="p-1 border border-zinc-200 rounded text-[11px] font-mono w-full focus:outline-none bg-white"
                          />
                        ) : (
                          story.email || '—'
                        )}
                      </td>

                      {/* FEATURE ID */}
                      <td className="py-3 px-4 font-mono font-bold text-zinc-500">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedFields.featureId || ''}
                            onChange={(e) => setEditedFields({ ...editedFields, featureId: e.target.value })}
                            className="p-1 border border-zinc-200 rounded text-xs w-full focus:outline-none bg-white font-bold"
                          />
                        ) : (
                          story.featureId || <span className="text-zinc-300 font-sans">—</span>
                        )}
                      </td>

                      {/* TITLE */}
                      <td className="py-3 px-4 truncate max-w-xs font-medium" title={story.title}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedFields.title || ''}
                            onChange={(e) => setEditedFields({ ...editedFields, title: e.target.value })}
                            className="p-1 border border-zinc-200 bg-white rounded text-xs w-full focus:outline-none font-bold"
                          />
                        ) : (
                          story.title
                        )}
                      </td>

                      {/* POINTS */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={editedFields.points || 0}
                            onChange={(e) => setEditedFields({ ...editedFields, points: Number(e.target.value) || 0 })}
                            className="p-1 border border-zinc-200 rounded text-xs w-16 text-center font-bold focus:outline-none bg-white"
                          />
                        ) : (
                          <span className="font-extrabold px-2 py-0.5 bg-zinc-100 rounded text-[10px] text-zinc-800">
                            {story.points} pt
                          </span>
                        )}
                      </td>
                      {/* HEALTH VALIDATION */}
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          const status = getStoryStatus(story);
                          if (status === 'BLOCKED') {
                            return (
                              <span className="px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold bg-red-100 text-red-700 border border-red-200 block text-center">
                                BLOCKED
                              </span>
                            );
                          }
                          if (status === 'WARNING') {
                            return (
                              <span className="px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold bg-amber-100 text-amber-850 border border-amber-200 block text-center">
                                WARNING
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 block text-center">
                                READY
                            </span>
                          );
                        })()}
                      </td>

                      {/* ACTIONS COL */}
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveInline(story.id)}
                              className="p-1 bg-zinc-950 text-white rounded hover:bg-black cursor-pointer"
                              title="Save Changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelInline}
                              className="p-1 bg-zinc-100 rounded hover:bg-zinc-200 cursor-pointer"
                              title="Cancel Edit"
                            >
                              <X className="w-3.5 h-3.5 text-zinc-500" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5 opacity-85 hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(story)}
                              className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black transition-colors cursor-pointer"
                              title="Edit Inline"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(story)}
                              className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black transition-colors cursor-pointer"
                              title="Duplicate Story"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteStory(story.id)}
                              className="p-1.5 hover:bg-red-50 rounded text-zinc-400 hover:text-red-700 transition-colors cursor-pointer"
                              title="Delete Story"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD STORY DIALOG */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddStorySubmit} className="bg-white rounded-3xl p-6 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-4 animate-scale-in font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Add Backlog story</span>
              <button type="button" onClick={() => setIsAddOpen(false)} className="p-1 hover:bg-zinc-100 rounded text-zinc-550 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 block">Story Title *</label>
                <input
                  type="text"
                  required
                  value={newStory.title}
                  onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                  placeholder="e.g. Access Request - SIT Integration"
                  className="p-2.5 border border-zinc-200 bg-zinc-50 rounded-xl w-full font-bold focus:bg-white text-xs focus:ring-1 focus:ring-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 block">Assignee</label>
                <select
                  value={newStory.resourceName}
                  onChange={(e) => setNewStory({ ...newStory, resourceName: e.target.value })}
                  className="p-2.5 border border-zinc-200 bg-zinc-50 rounded-xl w-full font-bold text-xs focus:bg-white focus:outline-none text-zinc-650"
                >
                  <option value="Unassigned">Unassigned</option>
                  {filteredCsvResources.map(r => (
                    <option key={r.email} value={r.displayName}>{r.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 block">Points</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={newStory.points}
                  onChange={(e) => setNewStory({ ...newStory, points: Number(e.target.value) || 1 })}
                  className="p-2.5 border border-zinc-200 bg-zinc-50 rounded-xl w-full font-bold text-xs focus:bg-white focus:ring-1 focus:ring-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 block">Feature ID</label>
                <input
                  type="text"
                  value={newStory.featureId}
                  onChange={(e) => setNewStory({ ...newStory, featureId: e.target.value })}
                  placeholder="e.g. 2174321"
                  className="p-2.5 border border-zinc-200 bg-zinc-50 rounded-xl w-full font-bold text-xs focus:bg-white focus:ring-1 focus:ring-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 block">Azure Work Classification</label>
                <select
                  value={newStory.workType}
                  onChange={(e) => setNewStory({ ...newStory, workType: e.target.value as any })}
                  className="p-2.5 border border-zinc-200 bg-zinc-50 rounded-xl w-full font-bold text-xs focus:bg-white focus:outline-none text-zinc-750"
                >
                  <option value="User Story">User Story (Default)</option>
                  <option value="Task">Task</option>
                  <option value="Bug">Bug</option>
                  <option value="Feature">Feature</option>
                  <option value="Epic">Epic</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs uppercase rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#FFCD11] text-black hover:bg-yellow-400 font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Add Story
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
