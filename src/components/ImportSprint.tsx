/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import { Upload, FileText, ChevronRight, CheckCircle2, Globe, FileSpreadsheet, Info, Terminal, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { SAMPLE_CSV_DATA } from '../constants/sampleData';
import { ParsedLineDebug, SprintStory } from '../types';

interface ImportSprintProps {
  rawContent: string;
  onContentChange: (content: string) => void;
  onParse: () => void;
  onUseSampleData: () => void;
  csvResourcesCount: number;
  onCsvUpload: (csvContent: string) => void;
  storiesCount: number;
  resourcesCount: number;
  domainsCount: number;
  onProceedToReview: () => void;
  debugLines?: ParsedLineDebug[];
  stories?: SprintStory[];
}

export default function ImportSprint({
  rawContent,
  onContentChange,
  onParse,
  onUseSampleData,
  csvResourcesCount,
  onCsvUpload,
  storiesCount,
  resourcesCount,
  domainsCount,
  onProceedToReview,
  debugLines = [],
  stories = [],
}: ImportSprintProps) {
  const [importMethod, setImportMethod] = useState<'paste' | 'confluence'>('paste');
  const [confluenceUrl, setConfluenceUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isDebugExpanded, setIsDebugExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const domainCounts = useMemo(() => {
    const list = [
      'CAT Rental',
      'Customer Master',
      'CUOB',
      'Warranty',
      'DLMA',
      'ONE Site',
      'CAT Inspect',
      'Equipment History',
      'Efficiency Improvement Effort'
    ];
    const counts: Record<string, number> = {};
    list.forEach(d => {
      counts[d] = 0;
    });

    if (stories) {
      stories.forEach(story => {
        const domainName = story.domain || '';
        const match = list.find(d => d.toLowerCase() === domainName.toLowerCase());
        if (match) {
          counts[match]++;
        } else {
          counts[domainName] = (counts[domainName] || 0) + 1;
        }
      });
    }
    return { counts, list };
  }, [stories]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onCsvUpload(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onCsvUpload(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportClick = () => {
    if (importMethod === 'confluence') {
      if (!confluenceUrl.trim()) return;
      // In sandbox preview we fetch / simulate parsing Confluence and load demo data for realism
      onUseSampleData();
      onParse();
    } else {
      onParse();
    }
  };

  // Check if button can be submitted
  const canSubmit = importMethod === 'confluence' ? confluenceUrl.trim().length > 0 : rawContent.trim().length > 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans text-black animate-fade-in">
      {/* Title block */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 uppercase">
          Sprint Ingestion
        </h1>
        <p className="text-zinc-500 text-sm max-w-2xl">
          Instantly ingest Confluence sprint planning tables and parse worker allocations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Core Import Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
            {/* Tab/Selector Bar */}
            <div className="flex border-b border-zinc-150 bg-zinc-50/50 p-1">
              <button
                type="button"
                id="tab-paste-content"
                onClick={() => setImportMethod('paste')}
                className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
                  importMethod === 'paste'
                    ? 'bg-white text-black shadow-sm border border-zinc-200/85'
                    : 'text-zinc-450 hover:text-zinc-700'
                }`}
              >
                Paste Sprint Content
              </button>
              <button
                type="button"
                id="tab-confluence-url"
                onClick={() => setImportMethod('confluence')}
                className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
                  importMethod === 'confluence'
                    ? 'bg-white text-black shadow-sm border border-zinc-200/85'
                    : 'text-zinc-450 hover:text-zinc-700'
                }`}
              >
                Confluence URL
              </button>
            </div>

            <div className="p-6">
              {importMethod === 'paste' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                      Sprint Backlog Notes
                    </label>
                  </div>
                  <textarea
                    value={rawContent}
                    onChange={(e) => onContentChange(e.target.value)}
                    placeholder="Paste Confluence text nodes here. Example:&#10;&#10;CUOB&#10;&#10;Karthikeyan - 5 pt&#10;Feature 2174321: SIT Validation - DO09 - E2E - 1.5 pt"
                    className="w-full h-80 p-4 font-mono text-zinc-800 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-black focus:outline-none resize-none transition-all placeholder:text-zinc-400 leading-relaxed"
                  />
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-2">
                      Confluence Page URL
                    </label>
                    <input
                      type="url"
                      value={confluenceUrl}
                      onChange={(e) => setConfluenceUrl(e.target.value)}
                      placeholder="https://confluence.cat.com/display/EN/Sprint+Planning+Notes"
                      className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-black focus:outline-none transition-all placeholder:text-zinc-400"
                    />
                  </div>
                  <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start space-x-3">
                    <Globe className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Connecting to enterprise Confluence Cloud. URLs matching registered domains are scraped for plan structures automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleImportClick}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center duration-200 shadow-sm ${
              canSubmit
                ? 'bg-black text-[#FFCD11] hover:bg-zinc-900 cursor-pointer active:scale-[0.99] hover:shadow-md'
                : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
            }`}
          >
            <span>Import Sprint</span>
            <ChevronRight className="w-4.5 h-4.5 ml-1.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Sidebar: CSV Upload & Summary */}
        <div className="space-y-6">
          {/* Upload Resource CSV */}
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center border-b border-zinc-100 pb-3">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-zinc-500" />
              Upload Resource CSV
            </h2>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border border-dashed p-5 text-center transition-all flex flex-col items-center justify-center h-28 group ${
                dragActive
                  ? 'border-[#FFCD11] bg-[#FFCD11]/5 animate-pulse'
                  : 'border-zinc-200 hover:border-[#FFCD11] bg-zinc-50 hover:bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className="w-5 h-5 text-zinc-400 group-hover:text-black mb-1.5 transition-colors" />
              <span className="text-[10px] font-bold text-zinc-850 uppercase block">Drop CSV or Click</span>
              <span className="text-[9px] text-zinc-400 block mt-0.5">Roster Profile DB</span>
            </div>

            <div className="bg-zinc-50 p-3 rounded-xl space-y-2 border border-zinc-150">
              <p className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">CSV Roster Columns Required:</p>
              <code className="block bg-white border border-zinc-200 p-2 rounded text-[9px] text-zinc-700 font-mono select-all">
                DisplayName,Email,Region
              </code>
              <p className="text-[9px] text-zinc-500 font-bold uppercase text-right">
                {csvResourcesCount} Enterprise mappings loaded
              </p>
            </div>
          </div>

          {/* Import Summary Block (only visible if storiesCount > 0) */}
          {storiesCount > 0 && (
            <div className="bg-white border-l-4 border-[#FFCD11] border-y border-r border-[#FFCD11]/20 p-6 rounded-2xl shadow-[0_4px_18px_rgba(0,0,0,0.03)] space-y-4 animate-fade-in">
              <div className="flex items-center space-x-2 text-emerald-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Parse Complete</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 py-1">
                <div className="bg-zinc-50 p-2.5 rounded-lg text-center border border-zinc-100">
                  <span className="text-lg font-black text-zinc-900 block leading-none">{resourcesCount}</span>
                  <span className="text-[9px] text-zinc-450 uppercase font-bold tracking-tight">Workers</span>
                </div>
                <div className="bg-zinc-50 p-2.5 rounded-lg text-center border border-zinc-100">
                  <span className="text-lg font-black text-zinc-900 block leading-none">{storiesCount}</span>
                  <span className="text-[9px] text-zinc-450 uppercase font-bold tracking-tight">Stories</span>
                </div>
              </div>

              {/* Parser Summary Panel with explicit counts */}
              <div className="border bg-zinc-50 border-zinc-150 p-3.5 rounded-xl space-y-2.5">
                <span className="text-[10px] font-black uppercase text-zinc-805 tracking-wider block pb-1 border-b border-zinc-200">
                  Parse Summary:
                </span>
                <div className="space-y-1 font-mono text-[10px] text-zinc-600 leading-normal">
                  <div className="flex justify-between">
                    <span>Active Team Members:</span>
                    <span className="font-extrabold text-black shrink-0">{resourcesCount} persons</span>
                  </div>
                  <div className="border-t border-dashed border-zinc-200 mt-2 pt-1.5 flex justify-between font-bold text-xs text-black">
                    <span>Total Stories Parsed:</span>
                    <span>{storiesCount}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onProceedToReview}
                className="w-full py-2.5 bg-black text-[#FFCD11] hover:bg-zinc-800 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1"
              >
                <span>Proceed to Review</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Parser Debug Panel (Only visible if debugLines is loaded) */}
      {debugLines && debugLines.length > 0 && (
        <div id="parser-debug-panel" className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden mt-8 text-zinc-300 font-sans">
          <div 
            onClick={() => setIsDebugExpanded(!isDebugExpanded)}
            className="p-4 bg-black border-b border-zinc-800 flex items-center justify-between cursor-pointer group text-zinc-100 select-none"
          >
            <div className="flex items-center space-x-2.5">
              <Terminal className="w-5 h-5 text-[#FFCD11]" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white leading-tight">
                  Confluence Backlog Parser Diagnostics
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono tracking-tight mt-0.5">
                  Line-by-line machine telemetry logging & state-classifier audits
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-zinc-400 group-hover:text-white transition-colors">
              <span className="text-[9px] font-mono uppercase bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-semibold">
                {debugLines.length} Lines Scanned
              </span>
              {isDebugExpanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-[#FFCD11]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-[#FFCD11]" />
              )}
            </div>
          </div>

          {isDebugExpanded && (
            <div className="p-4 bg-[#111111]/85">
              <div className="overflow-x-auto max-h-[32rem] overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950 font-mono text-[10px]">
                <table className="min-w-full divide-y divide-zinc-800 text-left">
                  <thead className="bg-[#18181b] sticky top-0 border-b border-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-400 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Line</th>
                      <th className="py-2.5 px-3">Raw Notes Content</th>
                      <th className="py-2.5 px-3 w-44">State/Classification</th>
                      <th className="py-2.5 px-3 w-40">Active Domain</th>
                      <th className="py-2.5 px-3 w-40">Allocated Worker</th>
                      <th className="py-2.5 px-3 w-16 text-center">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 leading-normal text-zinc-300">
                    {debugLines.map((entry) => {
                      // Color schemes depending on type
                      let typeBadge = '';
                      if (entry.detectedType === 'ASSIGNED_STORY') {
                        typeBadge = 'text-emerald-400 bg-emerald-950/80 border border-emerald-900 font-black';
                      } else if (entry.detectedType === 'VELOCITY_ENTRY') {
                        typeBadge = 'text-cyan-400 bg-cyan-950/85 border border-cyan-900 font-semibold';
                      } else if (entry.detectedType === 'RESOURCE_HEADER') {
                        typeBadge = 'text-amber-400 bg-amber-950/85 border border-amber-900 font-bold';
                      } else if (entry.detectedType === 'FEATURE_CATALOG_ENTRY') {
                        typeBadge = 'text-purple-400 bg-purple-950/85 border border-purple-900 font-semibold';
                      } else if (entry.detectedType === 'PROGRAM_HEADER') {
                        typeBadge = 'text-zinc-200 bg-zinc-800/80 border border-zinc-700 font-bold';
                      } else if (entry.detectedType === 'DOMAIN_HEADER') {
                        typeBadge = 'text-blue-400 bg-blue-950/80 border border-blue-900 font-black';
                      } else {
                        typeBadge = 'text-zinc-650 bg-zinc-900/40 border border-zinc-950 text-zinc-600';
                      }

                      return (
                        <tr 
                          key={entry.lineNumber} 
                          className="hover:bg-zinc-900/40 transition-colors border-b border-zinc-900/40"
                        >
                          {/* LINE NUMBER */}
                          <td className="py-2 px-3 text-center text-zinc-500 font-semibold border-r border-zinc-900">
                            {entry.lineNumber}
                          </td>

                          {/* RAW LINE CONTENT */}
                          <td className="py-2 px-3 text-zinc-200 font-medium select-all truncate max-w-xs md:max-w-md" title={entry.originalLine}>
                            {entry.originalLine || <span className="text-zinc-850 italic">(blank line)</span>}
                          </td>

                          {/* DETECTED TYPE */}
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] tracking-wider uppercase block text-center max-w-[150px] truncate ${typeBadge}`}>
                              {entry.detectedType}
                            </span>
                          </td>

                          {/* ASSIGNED DOMAIN */}
                          <td className="py-2 px-3 text-zinc-400 truncate max-w-[150px]" title={entry.assignedDomain}>
                            {entry.detectedType === 'IGNORE' ? '-' : entry.assignedDomain}
                          </td>

                          {/* ASSIGNED RESOURCE */}
                          <td className="py-2 px-3 text-zinc-300 font-medium truncate max-w-[150px]" title={entry.assignedResource}>
                            {entry.detectedType === 'IGNORE' ? '-' : entry.assignedResource}
                          </td>

                          {/* POINTS */}
                          <td className="py-2 px-3 text-center font-bold text-[#FFCD11]">
                            {entry.detectedType === 'ASSIGNED_STORY' || entry.detectedType === 'VELOCITY_ENTRY' ? entry.assignedPoints : '-'}
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
      )}
    </div>
  );
}
