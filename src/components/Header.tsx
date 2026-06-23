/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bolt, AlertTriangle, Settings, ChevronRight } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  warningsCount: number;
  managerRegion?: string;
}

export default function Header({ currentTab, onTabChange, warningsCount, managerRegion = 'India' }: HeaderProps) {
  const steps = [
    { id: 'import', label: 'Import', number: '01' },
    { id: 'review', label: 'Review Stories', number: '02' },
    { id: 'capacity', label: 'Allocation Health Check', number: '03' },
    { id: 'results', label: 'Create Stories', number: '04' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentTab);

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Main Branding */}
          <div className="flex items-center space-x-3.5">
            <div className="bg-[#FFCD11] p-2 rounded-xl text-black shadow-sm flex items-center justify-center transition-transform hover:rotate-6 duration-200">
              <Bolt className="w-5 h-5 fill-black stroke-black stroke-[3]" />
            </div>
            <div className="flex items-center">
              <span className="text-lg font-sans tracking-tight text-black flex items-center">
                <span className="font-bold">ENERGIZERS</span>
                <span className="text-zinc-300 mx-2 font-normal">|</span>
                <span className="text-zinc-500 font-medium">SPRINTSYNC</span>
              </span>
            </div>
          </div>

          {/* Quick Metrics & Settings Toggler */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-1.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-650">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>REGION: {managerRegion}</span>
            </div>

            <div className="hidden sm:flex items-center space-x-1.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-650">
              <span className="w-2 h-2 rounded-full bg-[#FFCD11]" />
              <span>ADO Link Ready</span>
            </div>

            {warningsCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{warningsCount} Issues</span>
              </div>
            )}

            {/* Settings Link */}
            <button
              onClick={() => onTabChange('settings')}
              className={`p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-zinc-100 text-[#111111] border border-zinc-300'
                  : 'text-zinc-500 hover:text-black hover:bg-zinc-100 border border-transparent'
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Linear/SaaS-Style Horizontal Workflow Stepper */}
        <div className="border-t border-zinc-100 py-3.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-2 md:space-x-4 min-w-max">
            {steps.map((step, idx) => {
              const isActive = currentTab === step.id;
              const isCompleted = currentStepIndex > idx;
              
              return (
                <React.Fragment key={step.id}>
                  {idx > 0 && (
                    <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => onTabChange(step.id)}
                    className="flex items-center space-x-2 text-left group focus:outline-none cursor-pointer"
                  >
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all ${
                      isActive
                        ? 'bg-[#FFCD11] border-[#FFCD11] text-black shadow-sm'
                        : isCompleted
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-450 group-hover:border-zinc-400 group-hover:text-zinc-700'
                    }`}>
                      {isCompleted ? '✓' : step.number}
                    </span>
                    <span className={`text-xs font-semibold tracking-tight transition-all uppercase ${
                      isActive
                        ? 'text-black font-bold'
                        : isCompleted
                        ? 'text-zinc-650'
                        : 'text-zinc-400 group-hover:text-zinc-700'
                    }`}>
                      {step.label}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
