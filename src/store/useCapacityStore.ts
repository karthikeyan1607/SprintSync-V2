/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { SprintStory, ResourceCapacity, AllocationHealth } from '../types';

interface CapacityStoreState {
  searchTerm: string;
  statusFilter: 'All' | 'Balanced' | 'Underallocated' | 'Overallocated';
  selectedResource: string | null;
  isAddingStory: boolean;
  editingStory: SprintStory | null;
  allocationHealth: AllocationHealth | null;
  
  // Setters
  setSearchTerm: (term: string) => void;
  setStatusFilter: (filter: 'All' | 'Balanced' | 'Underallocated' | 'Overallocated') => void;
  setSelectedResource: (resource: string | null) => void;
  setIsAddingStory: (isAdding: boolean) => void;
  setEditingStory: (story: SprintStory | null) => void;
  setAllocationHealth: (health: AllocationHealth | null) => void;
  
  // Resetters
  resetFilters: () => void;
}

export const useCapacityStore = create<CapacityStoreState>((set) => ({
  searchTerm: '',
  statusFilter: 'All',
  selectedResource: null,
  isAddingStory: false,
  editingStory: null,
  allocationHealth: null,

  setSearchTerm: (term) => set({ searchTerm: term }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSelectedResource: (resource) => set({ selectedResource: resource }),
  setIsAddingStory: (isAdding) => set({ isAddingStory: isAdding }),
  setEditingStory: (story) => set({ editingStory: story }),
  setAllocationHealth: (health) => set({ allocationHealth: health }),

  resetFilters: () => set({ searchTerm: '', statusFilter: 'All' }),
}));
