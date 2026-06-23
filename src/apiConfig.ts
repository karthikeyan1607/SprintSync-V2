/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Single configuration file for API endpoints
export const DEFAULT_API_BASE_URL = ((import.meta as any).env.VITE_API_BASE_URL || 'https://sprintsync-backend-f1va.onrender.com/api').replace(/\/$/, '');

/**
 * Returns the final API endpoint URL.
 * If the user's settings specify a custom `azureFunctionUrl` that is NOT "/api" and NOT empty,
 * we respect their settings. Otherwise, we fall back to the default API base URL.
 */
export function getApiUrl(endpoint: string, azureFunctionUrl?: string): string {
  let base = azureFunctionUrl;
  
  if (!base || base === '/api' || base.trim() === '') {
    base = DEFAULT_API_BASE_URL;
  }
  
  const cleanBase = base.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  return `${cleanBase}/${cleanEndpoint}`;
}
