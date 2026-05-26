# AppForge AI — JSON-Driven Application Generator

> Transform a JSON configuration file into a **fully working application** with forms, tables, dashboards, REST APIs, JWT auth, and CSV import — instantly.

---

## 🏗️ Architecture

```
ai-app-generator/
├── backend/              Node.js + Express + PostgreSQL
│   ├── src/
│   │   ├── db/           pool.js, migrations.sql
│   │   ├── middleware/   auth.js, validate.js, errorHandler.js
│   │   ├── routes/       auth.js, apps.js, dynamic.js
│   │   ├── services/     schemaService.js, recordService.js
│   │   └── index.js
│   ├── package.json
│   └── .env.example
└── frontend/             React + Vite
    ├── src/
    │   ├── components/
    │   │   ├── renderers/ FormRenderer, TableRenderer, DashboardRenderer
    │   │   ├── ui/        ErrorBoundary, LoadingSpinner, NotificationCenter, PWAInstallBanner
    │   │   └── layout/    Sidebar, Navbar
    │   ├── context/       AuthContext, NotificationContext
    │   ├── hooks/         useApp, useRecords
    │   ├── lib/           api.js (Axios)
    │   ├── pages/         Login, Register, Dashboard, AppBuilder, AppView
    │   └── App.jsx
    └── public/            manifest.json, sw.js
```

---

## ⚡ Quick Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

---

### 1. Clone & Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npm install
```

**Create the PostgreSQL database:**
```sql
createdb ai_app_generator
```

**Start the backend** (migrations run automatically on first start):
```bash
npm run dev     # Development with nodemon
# or
npm start       # Production
```
Backend runs on **http://localhost:4000**

---

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:5173**

---

### 3. Open the App

Navigate to **http://localhost:5173** and:
1. Register an account
2. Click **"New App"**
3. Paste your JSON config
4. Click **"Create App"** — your app is live!

---

## 🔑 Environment Variables

### Backend `.env`
```env
PORT=4000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_app_generator
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MAX=20

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_long_random_secret
JWT_EXPIRES=7d

FRONTEND_URL=http://localhost:5173
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:4000/api
```

---

## 📋 JSON Config Format

```json
{
  "app": "CRM",
  "entities": [
    {
      "name": "Contact",
      "fields": [
        { "name": "firstName", "type": "string",  "required": true,  "label": "First Name" },
        { "name": "email",     "type": "email",   "required": true,  "label": "Email" },
        { "name": "age",       "type": "number",                     "label": "Age" },
        { "name": "active",    "type": "boolean",                    "label": "Active" },
        { "name": "bio",       "type": "text",                       "label": "Bio" }
      ]
    }
  ],
  "views": [
    { "type": "form",      "entity": "Contact" },
    { "type": "table",     "entity": "Contact" },
    { "type": "dashboard", "widgets": ["count", "chart"] }
  ]
}
```

### Supported Field Types
| Type      | Input Rendered     | Validation                |
|-----------|--------------------|---------------------------|
| `string`  | Text input         | Type check                |
| `email`   | Email input        | Email regex               |
| `number`  | Number input       | Number check              |
| `boolean` | Checkbox           | Boolean check             |
| `text`    | Textarea           | String check              |
| `date`    | Date picker        | Date parse                |
| `url`     | URL input          | URL constructor           |
| `phone`   | Tel input          | Phone regex               |

---

## 🌐 REST API Reference

### Auth
```
POST /api/auth/register   { email, password }
POST /api/auth/login      { email, password }
GET  /api/auth/me         (requires Bearer token)
```

### Apps (all protected)
```
GET    /api/apps
POST   /api/apps              { config: {...} }
GET    /api/apps/:appId
PUT    /api/apps/:appId       { config: {...} }
DELETE /api/apps/:appId
GET    /api/apps/:appId/stats
```

### Records (dynamic, per-entity)
```
GET    /api/apps/:appId/:entity          ?limit=&offset=
POST   /api/apps/:appId/:entity          { ...fields }
GET    /api/apps/:appId/:entity/:id
PUT    /api/apps/:appId/:entity/:id      { ...fields }
DELETE /api/apps/:appId/:entity/:id
POST   /api/apps/:appId/:entity/import   multipart/form-data (file=CSV)
```

---

## ✨ Features

### Core
- ✅ JSON config → instant working app
- ✅ Dynamic form rendering with validation
- ✅ Dynamic table with search, sort, pagination
- ✅ Dashboard with bar + pie charts (Recharts)
- ✅ Full CRUD REST API auto-generated from config
- ✅ JSONB flexible storage in PostgreSQL
- ✅ JWT authentication with user-scoped data

### Bonus
- ✅ **CSV Import** — upload CSV per entity, bulk insert with per-row error report
- ✅ **In-App Notifications** — real-time toast + notification center with unread badge
- ✅ **PWA** — manifest.json, service worker (cache-first), "Add to Home Screen"

### UX
- ✅ Dark mode design with glassmorphism
- ✅ Error boundaries on every component (never crashes)
- ✅ Loading + empty + error states everywhere
- ✅ Responsive layout (mobile + desktop sidebar)
- ✅ Graceful fallback for unknown config fields/types

---

## 🐳 Dockerization & Containerized Deployments

AppGen is fully containerized with dual Docker Compose pipelines optimized for local development and high-performance production hosting.

### 📦 Container Architecture

```
                    ┌─────────────────────────┐
                    │      Web Browser        │
                    └────────────┬────────────┘
                                 │ HTTP (Port 8888 or 80)
                                 ▼
                     ┌───────────────────────┐
                     │   Nginx Container     │ (Serves React client & static assets)
                     │  (appgen_frontend)    │
                     └───────────┬───────────┘
                                 │
                   /api proxy    ▼
                     ┌───────────────────────┐
                     │   Node Express API    │ (Dynamic metadata CRUD + JWT Auth)
                     │   (appgen_backend)    │
                     └───────────┬───────────┘
                                 │
                   pg-pool connection
                                 ▼
                     ┌───────────────────────┐
                     │ PostgreSQL 16 DB      │ (JSONB storage layer)
                     │     (appgen_db)       │
                     └───────────────────────┘
```

---

### 💻 1. Local Development (with Hot Reloading)
This setup mounts your host directories into the containers, enabling backend **nodemon** live-reloads and frontend **Vite HMR (Hot Module Replacement)** instantly as you edit code on your host OS.

1. **Prepare configuration:**
   ```bash
   cp .env.example .env
   ```
2. **Run the stack:**
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```
3. **Access application:**
   - **Frontend:** [http://localhost:5173](http://localhost:5173) (with HMR)
   - **Backend API:** [http://localhost:4000/api](http://localhost:4000/api)
   - **PostgreSQL Database:** Port `5432` on localhost (accessible via any DB explorer like DBeaver or TablePlus with credentials in `.env`)

---

### 🚀 2. Production Deployment (Optimized & Secure)
The production stack uses multi-stage builds and isolated networking to minimize image sizes and maximize security:
- **Frontend Container:** Node builds Vite assets into static files, then Nginx serves the assets over Gzip and handles routing fallbacks. Backend is never exposed to the public host.
- **Backend Container:** Runs under an unprivileged user (`appgen`), performs automated database health checks, and starts under node production mode.

1. **Prepare your environment variables:**
   ```bash
   cp .env.example .env
   # Open .env and set secure values:
   # 1. DB_PASSWORD (strongly-encrypted password)
   # 2. JWT_SECRET (generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
   # 3. FRONTEND_PORT (default is 80)
   ```
2. **Run production stack:**
   ```bash
   docker compose up -d --build
   ```
3. **Monitor status:**
   ```bash
   docker compose ps
   docker compose logs -f backend
   ```
4. **Access application:**
   - Go to [http://localhost](http://localhost) (or custom port set via `FRONTEND_PORT`)
