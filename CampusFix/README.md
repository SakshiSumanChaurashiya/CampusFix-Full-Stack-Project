# CampusFix

A full-stack campus maintenance reporting app built with **React + Vite** and **Node.js + Express + SQLite**. The UI follows the supplied CampusFix homepage reference.

## Features

- Responsive homepage with the CampusFix hero, dashboard counters and recent reports
- Submit a report with title, category, location and description
- Automatically generated ticket IDs (for example `CF-A1B2C3`)
- Track all reports with search and status filters
- Live dashboard counts for Open, In progress and Resolved
- Admin-protected API endpoint for changing report status
- SQLite persistence; no external database account is needed
- One-service production deployment: Express serves the built React app and API

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Run locally

Open a terminal in the project root:

```bash
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` requests to the backend at `http://localhost:3000`.

If your shell does not support `cp`, create a `.env` file by copying the values in `.env.example`.

### Production-like local test

```bash
npm run build
npm start
```

Then open **http://localhost:3000**. The backend serves the built React app and API from one origin.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/issues` | List reports and dashboard statistics |
| GET | `/api/issues/:ticketCode` | Get one report |
| POST | `/api/issues` | Create a report |
| PATCH | `/api/issues/:ticketCode/status` | Update status (admin key required) |

Example create request:

```bash
curl -X POST http://localhost:3000/api/issues \
  -H "Content-Type: application/json" \
  -d '{"title":"Broken light near library","category":"Electrical","location":"Library, first floor","description":"The light is not working near the reading area."}'
```

Change a report status (use the `ADMIN_KEY` value from your environment):

```bash
curl -X PATCH http://localhost:3000/api/issues/CF-A1B2C3/status \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{"status":"in-progress"}'
```

Valid statuses: `open`, `in-progress`, `resolved`.

## Deploy to Render

This repository includes `render.yaml` for a single-service Render deployment.

1. Push the complete project folder to a GitHub repository.
2. In Render, choose **New + → Blueprint** and select that repository.
3. Render reads `render.yaml`, installs dependencies, builds React, and starts Express.
4. Wait for the service to become Live. The `/api/health` route is configured as its health check.
5. Open the generated `onrender.com` URL.

The Blueprint creates a persistent disk at `/var/data` and stores SQLite there using `DB_PATH`. This matters because a normal container filesystem may be temporary. Keep the disk attached if you want reports to survive redeploys.

## Important deployment notes

- Use the included Render Blueprint so the persistent disk and database path are configured together.
- Do not commit `.env`, database files, or real admin secrets to GitHub.
- Render's generated `ADMIN_KEY` protects status updates. Store it securely; do not put it in frontend code.
- The app is a functional project starter, not a production identity system. Add student/staff login, role permissions, rate limiting and backups before using it for real campus operations.
- The app does not need a separate frontend hosting service: the backend serves `frontend/dist` after the build.
