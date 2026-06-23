# SprintSync Decoupled Deployment Guide

This guide describes how to deploy the decoupled SprintSync application into production. 

```
┌─────────────────────────┐               ┌────────────────────────┐
│    Vercel Frontend      │ ────────────> │     Render Backend     │
│ (React + Vite + Tailwind)│  (CORS REST) │ (Express API / Node.js) │
└─────────────────────────┘               └────────────────────────┘
```

---

## Folder Architecture

The repository is organized into isolated, self-contained development workspaces:

*   **`/frontend`**: Tailored for **Vercel** or other static SPA hosts. Contains only React component logic, state managers, and Vite visual compilation utilities.
*   **`/backend`**: Tailored for **Render** (or similar web services hosting Node.js). Contains Express handlers for Azure DevOps handshakes and bulk User Story creation.

---

## 🚀 Part 1: Deploying Backend to Render

The backend is an Express Node.js application that proxies request parameters securely to the Azure DevOps REST APIs.

### Steps:
1. Log in to your **[Render Dashboard](https://dashboard.render.com/)**.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Set the following details:
   * **Name**: `sprintsync-backend`
   * **Language**: `Node`
   * **Root Directory**: `backend` (or leave empty if deploying a standalone backend repository)
   * **Build Command**: `npm install && npm run build` (runs `tsc` parser)
   * **Start Command**: `npm start` (runs `node dist/server.js`)
5. Click **Advanced** to add Environment Variables:
   * `PORT`: `10000` (Render's internal port)
   * `NODE_ENV`: `production`
   * `AZURE_DEVOPS_PAT`: *(Optional)* If provided, this personal access token will be used as a backend-wide fallback credential. If omitted, the server operates in a secure mock/evaluation simulator mode by default unless the client submits an transient token from their browser workspace.
6. Click **Deploy Web Service**.

Once deployed, copy the service URL (e.g. `https://sprintsync-backend.onrender.com`).

---

## 🎨 Part 2: Deploying Frontend to Vercel

The frontend is a React SPA which serves user interfaces, stores user configurations, parses Confluence layouts, and resolves resource roster capacities.

### Steps:
1. Log in to the **[Vercel Dashboard](https://vercel.com/)**.
2. Click **Add New** and select **Project**.
3. Import your GitHub repository.
4. In the configuration stage, specify:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `/` (current root) or `/frontend` if you want to deploy the isolated `/frontend` subfolder.
5. Expand **Build and Development Settings**:
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
6. Click **Deploy**.

---

## 🔒 Security & Safe Storage Design (Requirements 5 & 6)

1. **Client-Side Isolated Storage**: The Personal Access Token (PAT) remains exclusively in the user's browser local cache (`localStorage` raw key `sprintsync_pat` and structured `sprintsync_settings`). No token or credential is ever written to persistent databases or logged in long-term backend logs.
2. **CORS Safe Routing**: The Render Express backend comes equipped with standard CORS preflight configuration, allowing secure requests directly from your custom Vercel hosting domain.
3. **No UI Changes**: The user interface has not been altered, maintaining all original planning screens, capacity builders, charts, and metrics dashboard components intact.

---

## 🔗 Connecting the Frontend to Your Deployed Backend

To make your deployed frontend communicate with your custom backend:
1. Open your deployed **SprintSync Vercel Frontend** in the browser.
2. Select the **Settings** tab.
3. Replace the local fallback `azureFunctionUrl` entry with your newly deployed **Render Backend URL** (e.g., `https://sprintsync-backend.onrender.com/api`).
4. Enter your Azure DevOps credentials (Organization, Project Name, Area, Iteration, and PAT).
5. Click **Save Settings** & **Test Connection**.

The browser will initiate a handshake with your fresh Render server and render green verification upon active handshake!
