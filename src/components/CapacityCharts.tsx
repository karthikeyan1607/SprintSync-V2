/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ResourceCapacity, SprintStory } from '../types';

interface CapacityChartsProps {
  capacities: ResourceCapacity[];
  stories: SprintStory[];
}

export default function CapacityCharts({ capacities, stories }: CapacityChartsProps) {
  // 1. Calculate per-resource metrics for the double bar chart
  const resourceAllocations: Record<string, number> = {};
  stories.forEach((story) => {
    const name = story.resourceName.toLowerCase();
    if (name !== 'unassigned') {
      resourceAllocations[name] = (resourceAllocations[name] || 0) + story.points;
    }
  });

  const barChartData = capacities.map((cap) => {
    const allocated = Number((resourceAllocations[cap.resourceName.toLowerCase()] || 0).toFixed(1));
    return {
      name: cap.resourceName,
      Capacity: cap.capacity,
      Allocated: allocated,
    };
  });

  // 2. Calculate status counts for the donut chart
  let balancedCount = 0;
  let underallocatedCount = 0;
  let overallocatedCount = 0;

  capacities.forEach((cap) => {
    const allocated = resourceAllocations[cap.resourceName.toLowerCase()] || 0;
    if (allocated === cap.capacity) {
      balancedCount++;
    } else if (allocated < cap.capacity) {
      underallocatedCount++;
    } else {
      overallocatedCount++;
    }
  });

  const donutChartData = [
    { name: 'Balanced', value: balancedCount, color: '#10B981' },       // Emerald
    { name: 'Underallocated', value: underallocatedCount, color: '#F59E0B' }, // Amber
    { name: 'Overallocated', value: overallocatedCount, color: '#EF4444' },   // Red
  ].filter(item => item.value > 0); // Hide 0-value states to improve readability

  // Fallback safe rendering if no capacities exist
  if (capacities.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 p-8 rounded-2xl text-center text-zinc-400 font-medium font-sans text-xs uppercase tracking-wider">
        No capacity data mapped inside current context to draw visual dashboards.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* Chart 1: Capacity vs Allocated (Bar Chart) */}
      <div 
        id="chart-bar-container"
        className="lg:col-span-2 bg-white border border-zinc-200 p-6 rounded-2xl shadow-[0_4px_18px_-4px_rgba(0,0,0,0.03)] space-y-4"
      >
        <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
          <div>
            <h3 className="font-extrabold text-zinc-900 text-xs uppercase tracking-wider">
              Velocity Limits vs Load Volume
            </h3>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase mt-0.5">Points Allocation Per Teammate</p>
          </div>
        </div>
        
        <div className="h-72 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barChartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#71717A', fontSize: 10, fontWeight: 'medium' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#71717A', fontSize: 10, fontWeight: 'medium' }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#09090B', 
                  border: 'none', 
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: '#FFFFFF' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
              />
              {/* Capacity is Black and Allocated is Caterpillar Yellow */}
              <Bar dataKey="Capacity" fill="#18181B" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="Allocated" fill="#FFCD11" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Resource Allocation Status (Donut Chart) */}
      <div 
        id="chart-pie-container"
        className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-[0_4px_18px_-4px_rgba(0,0,0,0.03)] space-y-4"
      >
        <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
          <div>
            <h3 className="font-extrabold text-zinc-900 text-xs uppercase tracking-wider">
              Allocation Balance Distribution
            </h3>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase mt-0.5">Sprint Capacity Health</p>
          </div>
        </div>

        <div className="h-56 w-full relative flex items-center justify-center">
          {donutChartData.length === 0 ? (
            <div className="text-center text-zinc-400 font-medium text-xs">No resources mapped.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={false}
                >
                  {donutChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#09090B', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '11px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Donut interior absolute text indicators */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-zinc-900 leading-none">
              {capacities.length}
            </span>
            <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-widest mt-1">Resources</span>
          </div>
        </div>

        {/* Legend item listings */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2">
          {donutChartData.map((entry) => (
            <div key={entry.name} className="space-y-0.5">
              <span className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-zinc-650">
                <span className="w-2 h-2 rounded-full block flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}</span>
              </span>
              <p className="text-xs font-black text-zinc-900">{entry.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
