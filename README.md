# Garmin FIT Data Viewer

## Overview

This is a web application for viewing and analyzing Garmin FIT files (.fit or .fir). Upload a FIT file to see:

- **Summary statistics**: Number of data points, total distance (km), duration, average heart rate (BPM).
- **Interactive charts**: Heart rate, speed, and altitude over time using Recharts.
- **AI Insights**: Integrated AI proxy (via Cloudflare Worker) for querying training advice based on your data (demo: bicycle training via heart rate).

The app is built with modern best practices:
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Shadcn/UI components.
- **Charts**: Recharts + Chart.js.
- **FIT Parsing**: `fit-file-parser` library.
- **AI Backend**: Cloudflare Worker proxying requests to OpenRouter AI API (secure key handling).
- **PWA Ready**: Installable via Vite PWA plugin.

## Quick Start

### Prerequisites
- Node.js (18+), Bun or npm.
- [OpenRouter.ai account](https://openrouter.ai) for AI features (free tier available).

### 1. Clone & Install
```bash
git clone https://github.com/orozcoh/garmin-data-app.git
cd garmin-data-app
bun install  # or npm install
```

### 2. Environment Setup
Create these files with your secrets (add to `.gitignore`):

**`.env`** (Frontend - Vite env vars):
```
VITE_CLOUDFLARE_WORKER_URL=http://localhost:8787
```
- Local dev: `http://localhost:8787`
- Production: Replace with your deployed Worker URL (e.g., `https://your-worker.your-subdomain.workers.dev`).

**`.dev.vars`** (Cloudflare Worker local dev):
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```
- Get key from [OpenRouter.ai](https://openrouter.ai/keys).

### 3. Development

**Frontend**:
```bash
bun dev  # http://localhost:5173
```

**Worker** (in parallel terminal):
```bash
npx wrangler dev  # http://localhost:8787 (uses .dev.vars)
```

### 4. Build & Deploy

**Frontend**:
```bash
bun build
bun preview  # Preview dist/
```

**Worker**:
```bash
npx wrangler deploy  # Update .env with new URL
```

## Usage
1. Open `http://localhost:5173`.
2. Click **Choose FIT file** → Select Garmin activity file.
3. View stats & charts. AI demo logs training advice to console.

## File Structure
```
.
├── src/              # React app
│   ├── App.tsx       # Main component (upload, parse, charts)
│   └── lib/askAI.ts  # AI proxy client
├── worker/           # Cloudflare Worker
│   └── index.ts      # OpenRouter proxy (CORS, auth)
├── .env              # Frontend Worker URL
├── .dev.vars         # Worker API key (local)
├── wrangler.toml     # Worker config
└── package.json      # Deps: fit-file-parser, recharts, etc.
```

## Troubleshooting
- **AI Errors**: Check Worker logs (`wrangler dev`), verify API key & origin CORS.
- **CORS**: Worker allows only `http://localhost:5173` (update `ALLOWED_ORIGIN`).
- **FIT Parse Fail**: Ensure valid Garmin FIT file.

## License
MIT