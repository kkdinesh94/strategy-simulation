# Cloudflare Pages & D1 Database Complete Migration Guide

This guide details the complete architecture and deployment instructions for migrating **EV Venture League Simulation** from Firebase Firestore to **Cloudflare D1 Database + Cloudflare Pages & Workers**.

---

## 🏗️ Architecture Overview

| Component | Before (Firebase) | After (Cloudflare D1) |
| :--- | :--- | :--- |
| **Database Engine** | Google Cloud Firestore (NoSQL) | **Cloudflare D1 (Distributed SQLite 3 at Edge)** |
| **API Server / Routing** | Express.js / Node Container | **Cloudflare Pages Functions / Workers Edge (`functions/api/[[route]].ts`)** |
| **Frontend Assets** | SPA static build | **Cloudflare Pages Global CDN Edge** |
| **AI Advisor Proxy** | Node `@google/genai` | **Cloudflare Edge Worker with Gemini API proxy** |
| **Cold Starts** | ~500ms - 2s | **0ms (Instant Global Edge Execution)** |
| **Query Capability** | Simple Key/Range queries | **Full SQL Queries (`SELECT`, `JOIN`, `INDEX`, `GROUP BY`)** |

---

## 🚀 Quick 4-Step Cloudflare Deployment

### Step 1: Install Wrangler & Log in to Cloudflare
In your terminal, authenticate your machine with your Cloudflare account:
```bash
npx wrangler login
```

### Step 2: Create your Cloudflare D1 Database
Create a new D1 database named `ev-venture-league-d1`:
```bash
npx wrangler d1 create ev-venture-league-d1
```
*Note the `database_id` returned in the output.*

Update `wrangler.jsonc` or `wrangler.toml` with your database ID:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "ev-venture-league-d1",
    "database_id": "<YOUR_D1_DATABASE_ID>",
    "migrations_dir": "d1/migrations"
  }
]
```

### Step 3: Initialize Database Schema and Tables
Execute the provided SQL schema on your remote Cloudflare D1 database:
```bash
npx wrangler d1 execute ev-venture-league-d1 --file=d1/schema.sql --remote
```

*Or if you prefer Wrangler migrations:*
```bash
npx wrangler d1 migrations apply ev-venture-league-d1 --remote
```

### Step 4: Build and Deploy the Web App to Cloudflare Pages
Build the production assets and deploy them directly:
```bash
npm run build
npx wrangler pages deploy dist --project-name=ev-venture-league-simulation
```

To set your Gemini API key secret on Cloudflare Pages:
```bash
npx wrangler pages secret put GEMINI_API_KEY
```

---

## ⚡ In-App 1-Click Migration & Live Management

The simulation includes a dedicated **Cloudflare D1 Center** directly in the **Database & RBAC** tab (`AdminDatabaseTab.tsx`):

1. **Active Database Engine Toggle**: Switch between **Cloudflare D1 (Primary)**, **Hybrid Sync (D1 + Firestore)**, or **Firebase Firestore (Legacy)** in real-time.
2. **1-Click Firestore &rarr; Cloudflare D1 Live Migration**: Extracts all existing universes, simulation team states, student user accounts, passwords, and presence data, transforms them, and populates Cloudflare D1 tables automatically.
3. **Interactive D1 SQL Console**: Run live SQL queries (e.g., `SELECT * FROM universes;`, `SELECT * FROM users ORDER BY team_i ASC;`) directly from your browser.
4. **Export `.SQL` Dump**: Download a self-contained `.sql` file containing the complete D1 schema and all dataset rows ready for `wrangler d1 execute`.

---

## 📁 Repository Cloudflare Files

- `wrangler.jsonc` & `wrangler.toml`: Cloudflare Pages / Workers configuration with D1 database binding `DB`.
- `d1/schema.sql`: Complete D1 SQLite schema for Universes, Users, Team Decisions, Audit Logs, and App Settings.
- `d1/migrations/0001_initial.sql`: Versioned D1 migration.
- `functions/api/[[route]].ts`: Cloudflare Edge API router handling `/api/d1/*`, `/api/advisor`, `/api/health`.
- `src/lib/cloudflareD1.ts`: Client library with D1 CRUD, SQL console runner, and migration tools.
- `src/lib/dbProvider.ts`: Unified database provider supporting D1, Firestore, and Hybrid failover.
- `server/d1Store.ts` & `server.ts`: Local SQLite D1 emulation for local development and preview environments.
