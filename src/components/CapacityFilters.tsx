/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { useCapacityStore } from '../store/useCapacityStore';

export default function CapacityFilters() {
  const { 
    searchTerm, 
    setSearchTerm, 
    statusFilter, 
    setStatusFilter,
    resetFilters 
  } = useCapacityStore();

  const filterOptions: Array<{ value: typeof statusFilter; label: string; countClass: string }> = [
    { value: 'All', label: 'All Resources', countClass: 'bg-zinc-100 text-zinc-800' },
    { value: 'Balanced', label: 'Balanced (100%)', countClass: 'bg-emerald-100 text-emerald-800' },
    { value: 'Underallocated', label: 'Underallocated (<100%)', countClass: 'bg-amber-100 text-amber-800' },
    { value: 'Overallocated', label: 'Overallocated (>100%)', countClass: 'bg-red-100 text-red-800' },
  ];

  return (
    <div 
      id="capacity-filters-panel"
      className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-4 items-center justify-between font-sans"
    >
      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <span className="absolute left-3.5 top-3 text-zinc-400">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by resource name..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#FFCD11] focus:border-[#FFCD11] focus:outline-none text-zinc-800 placeholder:text-zinc-400 transition-all font-sans"
        />
      </div>

      {/* Segmented Filter Buttons */}
      <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
        <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider flex items-center mr-1">
          <Filter className="w-3.5 h-3.5 mr-1" /> Filter Status:
        </span>
        
        <div className="bg-zinc-50 p-1 rounded-xl border border-zinc-200 flex flex-wrap gap-1">
          {filterOptions.map((opt) => {
            const isActive = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-black text-white shadow-sm' 
                    : 'text-zinc-650 hover:text-black hover:bg-zinc-150'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Reset Trigger */}
        {(searchTerm !== '' || statusFilter !== 'All') && (
          <button
            type="button"
            onClick={resetFilters}
            className="p-2 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-xl transition-all cursor-pointer flex items-center text-xs font-semibold"
            title="Reset active filtering configurations"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
