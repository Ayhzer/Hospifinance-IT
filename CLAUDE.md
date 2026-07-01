# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hospifinance-IT** is a **generic, reusable** financial management dashboard for hospital IT departments (DSI), tracking OPEX and CAPEX budgets. It is a React 18 + Vite SPA with optional Node.js/Express + MongoDB backend. The app runs entirely in the browser by default using `localStorage` for persistence.

It is a generic fork of "Hospifinance HFAR": **no hospital-specific data is hardcoded**. Establishment identity, source-software names, accounting rules, accounts, families and budgets are externalized into `src/config/` and the data repo. Import is **software-agnostic** (canonical column model — see "Import" below).

The UI language is **French** — all labels, comments, and user-facing strings are in French.

## Configuration (where the "specific" lives)

Everything establishment-specific is in **`src/config/`**:
- `establishment.js` — `ESTABLISHMENT` (name, shortName, department, currency, defaultYear). Exports `DEFAULT_ESTABLISHMENT` (build-time defaults) merged at module load with any runtime override.
- `sources.js` — `SOURCE_SOFTWARE` (display labels for the orders/payments software). Same default+override pattern (`DEFAULT_SOURCE_SOFTWARE`).
- `accounting.js` — `ACCOUNTING` (OPEX/CAPEX account prefixes, `managerFilter`) and `getLineType()`.
- `runtimeConfig.js` — runtime override layer (localStorage key `hospifinance_app_config`) written by the first-launch wizard, plus `isSetupDone()` gating.

**First-launch wizard.** `components/setup/SetupGate.jsx` (mounted in `main.jsx` inside the providers) shows `SetupWizard.jsx` on a fresh standalone install — 4 steps: establishment identity, source-software labels, data mode (local vs GitHub), admin password. It writes identity/sources to `runtimeConfig`, then **reloads the page** so config read at import time (e.g. `ANNEE_PILOTAGE`, demo EPRD) is recomputed. The wizard is **skipped** when a backend is configured via env (`VITE_API_URL` / `VITE_GITHUB_TOKEN`) or when legacy data already exists, so existing deployments are untouched.

Demo accounts/families/budgets live in `src/constants/analytiqueConstants.js` but are primarily edited in-app (Reclassement, Budget EPRD) and stored in the data repo.

## Import (canonical model)

There is **one canonical, header-based import format**, not per-software parsers:
- `services/importSchema.js` — `CANONICAL_ORDERS_COLUMNS` / `CANONICAL_PAYMENTS_COLUMNS`, `buildHeaderResolver()` (matches columns by name; accent/case-insensitive; aliases; order-independent).
- `services/xlsxImportService.js` — `importCommandes(file, { exercice, convertHT, moteur })` (unified parser, replaces the old MAGH2/SAGE parsers).
- `services/importTemplates.js` — `downloadOrdersTemplate()` / `downloadPaymentsTemplate()` generate a sample `.xlsx` (headers + demo rows + "Notice" sheet).
- `components/common/ImportModal.jsx` — exposes the "Télécharger le fichier exemple" button and calls `onCommandesImport`.

### Auto-import (watched source file)

Optional, **local-server mode only** (`VITE_API_URL` set). The app watches a configured source file and offers to re-import on launch when a newer version appears:
- `hooks/useAutoImportWatcher.js` — on mount, polls `GET /auto-import/status`; exposes `pending` when the file signature (name/mtime/size) differs from the last seen/imported.
- `components/common/AutoImportUpdateModal.jsx` — fetches the file (`GET /auto-import/file`), parses it through `importCommandes` (canonical circuit), and applies the data.
- `local-server.js` — `autoImportStatus()` + the two `/auto-import/*` routes; the source path/filename come from `settings.autoImport` (configured in Paramètres → « Source automatique »). In browser-only mode the hook is inert.

### Budget editor & nomenclature

- `components/analytique/BudgetEditorModal.jsx` — two-tab modal opened by "Renseigner le budget": OPEX (`EprdBudgetEditor.jsx`, EPRD per ordering account) and CAPEX (`CapexBudgetEditor.jsx`, global-per-year + per-envelope with a non-blocking balance check).
- `components/reclassement/GestionNomenclature.jsx` — editable analytic **nomenclature** (familles + sous-catégories, Run/Build périmètre). The nomenclature is the source of truth (`DEFAULT_NOMENCLATURE` fallback in `constants/analytiqueConstants.js`); rename/remove **cascade** through engine rules and data (`hooks/useReclassementData.js`, orchestrated in `App.jsx`). `components/reclassement/OrdersPreview.jsx` shows the orders impacted by each rule.

## Workspace Layout

The workspace root (`Hospifinance-IT/`) contains two sibling folders:
- `hospifinance-it/` — the application (this is the real project root; run all commands here)
- `hospifinance-it-data/` — a sibling repo holding data as JSON (`data/*.json`: users, opex, opex-orders, capex, capex-orders, eprd, reclassement, settings). Ships with a **fictional demo dataset**. The app reads/writes these files via the local API server or the GitHub API when sync is enabled. For real data, use a **private** repo.

## Development Commands

All commands run from `hospifinance-it/` (the actual project root inside the workspace).

```bash
npm run dev        # Dev server at http://localhost:5173 (frontend only)
npm run server     # Local API server at http://localhost:3001 (Node.js, no external deps)
npm start          # Both dev + server concurrently
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm run lint       # ESLint (max 0 warnings)
npm run deploy     # Deploy to GitHub Pages
```

Backend (optional, in `backend/`):
```bash
npm run dev        # nodemon auto-reload Express server
npm run init-db    # Initialize MongoDB collections
```

Windows convenience scripts also exist: `INSTALL.bat`, `START.bat`, `BUILD.bat`, `START-HOSPIFINANCE-IT.bat` (frontend + local API), and `START_IT.bat` (frontend only on port 5174, localStorage mode).

## Architecture

### Data Flow

```
User interaction
  → Component (UI event)
  → Custom Hook (useOpexData / useCapexData / useOrderData)
  → Validation (utils/validators.js)
  → Business logic (utils/calculations.js)
  → Context update (AuthContext / SettingsContext)
  → Service layer (storageService.js ↔ apiService.js)
  → localStorage or REST API
  → Optional GitHub sync (githubStorageService.js)
```

### State Management

No Redux/Zustand. State lives in three Context providers:
- **AuthContext** — current user, role (`superadmin` / `admin` / `user`), audit log, session
- **SettingsContext** — appearance, column visibility, budget rules, user list
- **PermissionsContext** — derived permission flags computed from AuthContext role

Domain data (OPEX rows, CAPEX projects, orders) is managed entirely in dedicated hooks:
- `useOpexData` — supplier/budget rows, filter/sort state
- `useCapexData` — projects, envelopes, status
- `useOrderData` — 6-status order lifecycle (`pending → ordered → delivered → invoiced → paid / cancelled`)
- `useBudgetCalculations` — three memoized hooks: `useOpexTotals`, `useCapexTotals`, `useConsolidatedTotals`

### Persistence Abstraction

There are three interchangeable persistence backends, all behind the same service shape:
- `storageService.js` — localStorage (default)
- `apiService.js` — REST calls to the Express/MongoDB backend (activated by `VITE_API_URL`)
- `githubStorageService.js` — reads/writes JSON files in the `hospifinance-it-data` repo via the GitHub API (activated by the `VITE_GITHUB_*` variables)

Swapping backends only requires changing the service used inside hooks — no component changes needed. `xlsxImportService.js` handles Excel import; export to CSV/JSON/PDF/XLSX uses `utils/exportUtils.js` with the `xlsx` and `jspdf` libraries.

### Navigation

**No routing library (no React Router).** Tab-based navigation is implemented manually in `src/App.jsx`. All tabs can be reordered via HTML5 drag-and-drop and the order is persisted to localStorage. New navigation elements should follow the existing vertical sidebar pattern with collapsible sections — do not add dropdown menus.

### Component Structure

`src/components/` folders map 1-to-1 with app sections:
- `auth/` — LoginPage, UserManagement
- `dashboard/` — DashboardView, KPI cards, widget builder
- `dashboard-builder/` — Custom dashboard creation
- `opex/` — OpexTable, OpexModal, supplier management
- `capex/` — CapexTable, CapexModal, project tracking
- `orders/` — OrderTable, OrderModal, status workflow (OPEX and CAPEX variants)
- `settings/` — SettingsPanel, appearance, rules, column config, GitHub sync
- `analytique/` — AnomaliesPanel, EprdBudgetEditor, advanced analytics
- `reclassement/` — Budget reclassification engine
- `reconciliation/` — Data reconciliation validation
- `editeurs/` — Editor (software vendor) analysis
- `projection/` — Budget projection engine
- `common/` — shared UI primitives (Modal, Table, Form controls)

## Key Conventions

- **Imports order**: React → third-party → local contexts → local hooks → local components → utils
- **Memoization**: `useMemo`/`useCallback` expected on all expensive computations and stable callback references passed as props
- **Stable filter inputs**: `useTableControls` hook uses `React.memo` and careful closure management to prevent focus loss during multi-character typing — preserve this pattern in table components
- **No test suite** is configured — there is no `npm test`. Validate changes manually via the running app
- **ESLint** enforces React hooks rules and react-refresh warnings; run `npm run lint` before any PR
- **Dev auto-login**: In localhost/dev mode, authentication is bypassed automatically for faster iteration
- **Optional authentication**: `AuthContext` reads `isAuthRequired()` (`config/runtimeConfig.js`). When auth is disabled (Paramètres → Sécurité), the app grants direct admin access with no login screen; `updateAuthRequired(true)` clears the session and forces login
- **⚠️ Password storage (security debt)**: in localStorage/browser mode, `AuthContext` stores passwords with `btoa()` (base64, **reversible — not a hash**). Fine for a local single-station demo, **insufficient for any network deployment**. Before exposing the app on a network, move auth to the `backend/` Express/MongoDB server and implement salted hashing (`bcrypt`/`argon2`) server-side over HTTPS. Do not reintroduce a client-side "hash" and call it secure. See the Sécurité sections of `README.md` and `backend/README.md`.

## Environment Variables

See `.env.example`. Key variables:
- `VITE_API_URL` — activates backend API mode (leave unset for localStorage mode)
- `VITE_GITHUB_TOKEN`, `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_BRANCH`, `VITE_GITHUB_DATA_PATH` — optional GitHub storage sync

## Existing Documentation

Before modifying core logic, consult:
- `README.md` — feature overview, setup, and persistence modes
- `CHANGELOG.md` — version history and breaking changes
- `backend/README.md` — optional Express/MongoDB API setup (Docker, endpoints)
