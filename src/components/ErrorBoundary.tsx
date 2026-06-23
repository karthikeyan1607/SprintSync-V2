/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Download, Terminal, Settings } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside SprintSync app:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleWipeAndReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  private handleExportRescueData = () => {
    try {
      const backup: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sprintsync_')) {
          backup[key] = localStorage.getItem(key);
        }
      }
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.id = "error-boundary-export-link";
      link.href = url;
      link.download = `sprintsync_rescue_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
    } catch (e) {
      alert('Could not export backup: ' + String(e));
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          id="error-boundary-root"
          className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 font-sans selection:bg-[#FFCD11] selection:text-black"
        >
          <div className="max-w-2xl w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
            {/* Top CAT Brand Belt */}
            <div className="absolute top-0 inset-x-0 h-2.5 bg-[#FFCD11]" />

            {/* Title block */}
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4 md:gap-5 pt-3">
              <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#FFCD11] font-extrabold uppercase tracking-widest block">System Failure Intercept</span>
                <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Energizer SprintSync Crashed</h1>
                <p className="text-xs text-zinc-400 font-medium">An unhandled core execution exception occurred. Don't worry, your work is saved locally.</p>
              </div>
            </div>

            {/* Error Log Console */}
            <div className="bg-black/85 border border-zinc-800 rounded-xl p-4 font-mono text-zinc-300 text-[10.5px] leading-relaxed space-y-3 relative">
              <div className="flex items-center justify-between text-zinc-500 border-b border-zinc-900 pb-2 mb-1">
                <span className="flex items-center text-[9px] uppercase font-bold tracking-wider">
                  <Terminal className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /> Core Log Diagnostics
                </span>
                <span className="text-[9px] text-[#FFCD11] font-bold">FATAL ERROR</span>
              </div>
              <div>
                <p className="font-extrabold text-[#FFCD11]">Exception: {this.state.error?.name || 'Error'}</p>
                <p className="text-red-400 font-medium mt-1">{this.state.error?.message || 'Unknown Exception'}</p>
              </div>
              {this.state.error?.stack && (
                <div className="max-h-36 overflow-y-auto text-zinc-500 text-[9.5px] whitespace-pre-wrap font-mono mt-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 border-t border-zinc-950 pt-2">
                  {this.state.error.stack}
                </div>
              )}
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                id="error-boundary-rescue-btn"
                onClick={this.handleExportRescueData}
                className="p-3.5 bg-zinc-800 hover:bg-zinc-700 text-white hover:text-[#FFCD11] font-black uppercase text-xs rounded-xl border border-zinc-700 duration-150 cursor-pointer flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4 text-[#FFCD11]" />
                <span>Export Session Rescue</span>
              </button>

              <button
                id="error-boundary-recovery-btn"
                onClick={this.handleWipeAndReset}
                className="p-3.5 bg-[#FFCD11] hover:bg-yellow-400 text-black font-black uppercase text-xs rounded-xl duration-150 cursor-pointer flex items-center justify-center space-x-2 shadow"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>Reset SprintSync Core</span>
              </button>
            </div>

            {/* Helpful Advisory block */}
            <div className="border-t border-zinc-800/80 pt-4 text-center">
              <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center justify-center">
                <Settings className="w-3.5 h-3.5 mr-1.5 text-zinc-600" /> Need Assistance? Provide the "Session Rescue" file to DevOps support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
