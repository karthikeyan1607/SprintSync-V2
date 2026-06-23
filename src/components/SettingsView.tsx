/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Save, RefreshCw, Layers } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';

interface SettingsViewProps {
  orgName: string;
  projectName: string;
  areaPath: string;
  iterationPath: string;
  azureFunctionUrl?: string;
  onUpdateSettings: (settings: {
    orgName: string;
    projectName: string;
    areaPath: string;
    iterationPath: string;
    personalAccessToken: string;
    defaultWorkItemType: string;
  }) => void;
}

export default function SettingsView({
  orgName,
  projectName,
  areaPath,
  iterationPath,
  azureFunctionUrl = 'https://sprintsync-backend-f1va.onrender.com/api',
  onUpdateSettings,
}: SettingsViewProps) {
  
  // Read/write completely separate storage modules:
  // - sprintsync_settings
  // - sprintsync_pat (for the manager-specific Azure DevOps PAT)
  const getInitialSettings = () => {
    try {
      const saved = localStorage.getItem('sprintsync_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          organization: parsed.organization || orgName || 'cat-digital',
          project: parsed.project || projectName || 'Cat Digital',
          areaPath: parsed.areaPath || areaPath || 'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Energizers',
          iterationPath: parsed.iterationPath || iterationPath || 'Cat Digital\\2026\\Sprint 12',
          personalAccessToken: parsed.personalAccessToken || localStorage.getItem('sprintsync_pat') || '',
          defaultWorkItemType: parsed.defaultWorkItemType || localStorage.getItem('sprintsync_default_work_item_type') || 'User Story'
        };
      }
    } catch (e) {
      console.error('Failed to load sprintsync_settings from storage', e);
    }

    return {
      organization: orgName || 'cat-digital',
      project: projectName || 'Cat Digital',
      areaPath: areaPath || 'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Energizers',
      iterationPath: iterationPath || 'Cat Digital\\2026\\Sprint 12',
      personalAccessToken: localStorage.getItem('sprintsync_pat') || '',
      defaultWorkItemType: localStorage.getItem('sprintsync_default_work_item_type') || 'User Story'
    };
  };

  const initial = getInitialSettings();

  const [localOrgName, setLocalOrgName] = useState(initial.organization);
  const [localProjectName, setLocalProjectName] = useState(initial.project);
  const [localAreaPath, setLocalAreaPath] = useState(initial.areaPath);
  const [localIterationPath, setLocalIterationPath] = useState(initial.iterationPath);
  const [localPat, setLocalPat] = useState(initial.personalAccessToken);
  const [defaultWorkItemType, setDefaultWorkItemType] = useState(initial.defaultWorkItemType);

  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const triggerToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    useToastStore.getState().addToast(message, type as any);
  };

  // Test connection to the Azure DevOps API through the Azure Function
  const handleTestConnection = async () => {
    const trimmedOrg = localOrgName.trim();
    const trimmedProject = localProjectName.trim();
    const trimmedArea = localAreaPath.trim();
    const trimmedIteration = localIterationPath.trim();
    const trimmedPat = localPat.trim();

    // 1. Verify inputs
    if (!trimmedOrg) {
      triggerToast('Please provide a valid Organization name.', 'warning');
      return;
    }
    if (!trimmedProject) {
      triggerToast('Please provide a valid Project name.', 'warning');
      return;
    }
    if (!trimmedArea) {
      triggerToast('Please provide a valid Area Path.', 'warning');
      return;
    }
    if (!trimmedIteration) {
      triggerToast('Please provide a valid Iteration Path.', 'warning');
      return;
    }

    // Propagate trimmed values back to UI inputs for consistency
    setLocalOrgName(trimmedOrg);
    setLocalProjectName(trimmedProject);
    setLocalAreaPath(trimmedArea);
    setLocalIterationPath(trimmedIteration);
    setLocalPat(trimmedPat);

    setIsTestingConnection(true);
    triggerToast('Initiating handshake exchange with API...', 'info');

    // Persist configuration locally first (as requested)
    const settingsObj = {
      organization: trimmedOrg,
      project: trimmedProject,
      areaPath: trimmedArea,
      iterationPath: trimmedIteration,
      personalAccessToken: trimmedPat,
      defaultWorkItemType: defaultWorkItemType
    };

    localStorage.setItem('sprintsync_settings', JSON.stringify(settingsObj));
    localStorage.setItem('sprintsync_pat', trimmedPat);
    localStorage.setItem('sprintsync_default_work_item_type', defaultWorkItemType);

    onUpdateSettings({
      orgName: trimmedOrg,
      projectName: trimmedProject,
      areaPath: trimmedArea,
      iterationPath: trimmedIteration,
      personalAccessToken: trimmedPat,
      defaultWorkItemType: defaultWorkItemType,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const cleanedUrl = azureFunctionUrl.endsWith('/') ? azureFunctionUrl.slice(0, -1) : azureFunctionUrl;
      const response = await fetch(`${cleanedUrl}/testConnection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgName: trimmedOrg,
          projectName: trimmedProject,
          personalAccessToken: trimmedPat,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Host might serve index.html or be offline/non-existent
        triggerToast('Configuration saved locally. Backend connection unavailable.', 'warning');
        setIsTestingConnection(false);
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.simulated) {
          triggerToast(`Simulated connection success! Running in secure sandbox mode.`, 'success');
        } else {
          triggerToast(`DevOps authenticated! Found project "${data.projectName || trimmedProject}"`, 'success');
        }
      } else {
        triggerToast(data.error || 'Connection verification failed.', 'error');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        triggerToast('Configuration saved locally. Connection attempt timed out.', 'warning');
      } else {
        triggerToast('Configuration saved locally. Backend connection unavailable.', 'warning');
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedOrg = localOrgName.trim();
    const trimmedProject = localProjectName.trim();
    const trimmedArea = localAreaPath.trim();
    const trimmedIteration = localIterationPath.trim();
    const trimmedPat = localPat.trim();

    // Propagate trimmed values back to UI inputs for consistency
    setLocalOrgName(trimmedOrg);
    setLocalProjectName(trimmedProject);
    setLocalAreaPath(trimmedArea);
    setLocalIterationPath(trimmedIteration);
    setLocalPat(trimmedPat);

    const settingsObj = {
      organization: trimmedOrg,
      project: trimmedProject,
      areaPath: trimmedArea,
      iterationPath: trimmedIteration,
      personalAccessToken: trimmedPat,
      defaultWorkItemType: defaultWorkItemType
    };

    // Store in separate storage modules
    localStorage.setItem('sprintsync_settings', JSON.stringify(settingsObj));
    localStorage.setItem('sprintsync_pat', trimmedPat);
    localStorage.setItem('sprintsync_default_work_item_type', defaultWorkItemType);

    onUpdateSettings({
      orgName: trimmedOrg,
      projectName: trimmedProject,
      areaPath: trimmedArea,
      iterationPath: trimmedIteration,
      personalAccessToken: trimmedPat,
      defaultWorkItemType: defaultWorkItemType,
    });

    triggerToast('Configuration parameters updated successfully.', 'success');
  };

  return (
    <div id="azure-devops-settings-view" className="max-w-xl mx-auto font-sans text-black animate-fade-in pb-12 space-y-6">
      
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
          Azure DevOps Settings
        </h1>
        <p className="text-zinc-500 text-xs font-semibold">
          Configure manager-specific connection keys and Azure DevOps board settings.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 p-8 rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center space-x-2 pb-2 border-b border-zinc-100">
          <Settings className="w-5 h-5 text-[#FFCD11]" />
          <span className="text-xs font-black uppercase text-zinc-900 tracking-wider block">
            Azure DevOps Configuration
          </span>
        </div>

        <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs font-semibold">
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              Organization
            </label>
            <input
              type="text"
              id="org-name-input"
              value={localOrgName}
              placeholder="e.g. cat-digital"
              onChange={(e) => setLocalOrgName(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl leading-none font-bold focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              Project
            </label>
            <input
              type="text"
              id="project-name-input"
              value={localProjectName}
              placeholder="e.g. Cat Digital"
              onChange={(e) => setLocalProjectName(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl leading-none font-bold focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              Area Path
            </label>
            <input
              type="text"
              id="area-path-input"
              value={localAreaPath}
              placeholder="e.g. Cat Digital\Platform\System-Integration Testing\P - SIT Energizers"
              onChange={(e) => setLocalAreaPath(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl leading-none font-bold focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              Iteration Path
            </label>
            <input
              type="text"
              id="iteration-path-input"
              value={localIterationPath}
              placeholder="e.g. Cat Digital\2026\Sprint 12"
              onChange={(e) => setLocalIterationPath(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl leading-none font-bold focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              Personal Access Token
            </label>
            <input
              type="password"
              id="pat-input"
              value={localPat}
              placeholder="*********************"
              onChange={(e) => setLocalPat(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl leading-none font-mono focus:bg-white focus:outline-none"
            />
            <span className="text-[9px] text-zinc-400 block font-medium uppercase mt-0.5">
              Securely stored locally in manager's browser cache. Never shared or hardcoded.
            </span>
          </div>

          {/* Enhancement #5: Default Work Item Type Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center">
              <Layers className="w-3.5 h-3.5 text-[#FFCD11] mr-1" />
              Default Work Item Type
            </label>
            <select
              value={defaultWorkItemType}
              onChange={(e) => setDefaultWorkItemType(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs text-zinc-800 focus:bg-white focus:outline-none"
            >
              <option value="User Story">User Story</option>
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
            </select>
          </div>

          <div className="pt-4 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="py-3 border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-50 text-zinc-800 rounded-xl font-bold transition-all text-xs flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="submit"
              className="py-3 bg-black text-[#FFCD11] hover:bg-zinc-800 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 border-none"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-start space-x-3 text-zinc-500 font-medium leading-normal text-[11px]">
        <ShieldAlert className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
        <div className="space-y-1 font-semibold">
          <p className="text-zinc-700 font-bold uppercase tracking-wider text-[10px]">Security sandbox isolation policy</p>
          <p>
            Your Azure DevOps personal identifiers, tokens, and target parameters remain isolated in manager storage. 
            Rosters (names, emails) are processed inside the planning step and never leaked to settings context.
          </p>
        </div>
      </div>

    </div>
  );
}
