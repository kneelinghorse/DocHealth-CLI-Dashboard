# DocHealth Dashboard

**Web dashboard for visualizing documentation health metrics and trends**

---

## Overview

The DocHealth Dashboard is a React + Vite web application that provides real-time visualization of documentation health metrics. It displays health scores, tracks trends over time, and helps identify stale documentation and coverage gaps.

---

## Features

- **Health Score Dashboard** - Real-time health score with trend charts
- **Stale Documentation Browser** - List and drill-down into stale protocols
- **Coverage Gap Analysis** - Browse undocumented API endpoints, data fields, and workflows
- **Historical Tracking** - SQLite-backed trend tracking over time
- **Protocol Filtering** - Filter by protocol type (API, Data, Workflow, Docs)

---

## Quick Start

### Development Mode

```bash
# From project root
node bin/dochealth.js serve --port 3000

# Or from dashboard directory
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Production Mode

```bash
# Build the dashboard
npm run build

# Serve from project root
NODE_ENV=production node bin/dochealth.js serve --port 8080
```

---

## Architecture

### Frontend (React + Vite)

- **Framework**: React 19 with Vite
- **Routing**: React Router
- **Charts**: Nivo (@nivo/line, @nivo/bar) for accessible visualizations
- **Styling**: CSS with theming support

### Backend (Express + SQLite)

- **API Server**: Express with REST endpoints
- **Database**: SQLite (better-sqlite3) for trend tracking
- **Schema**: Normalized tables for analysis runs, protocol definitions, and snapshots

### Data Flow

1. CLI (`dochealth check`) writes analysis results to SQLite database
2. Dashboard API reads from SQLite and serves JSON endpoints
3. React frontend fetches data and renders visualizations

---

## API Endpoints

### GET /api/health/current
Returns the latest health analysis results.

**Response:**
```json
{
  "runId": 1,
  "timestamp": 1700000000,
  "overallHealthScore": 85.5,
  "totalProtocolsAnalyzed": 9,
  "protocols": [...]
}
```

### GET /api/health/history?days=30
Returns historical health scores for trend analysis.

**Query Parameters:**
- `days` (optional): Number of days of history to retrieve (default: 30)

**Response:**
```json
{
  "runs": [
    {
      "runId": 1,
      "timestamp": 1700000000,
      "overallHealthScore": 85.5
    },
    ...
  ]
}
```

### POST /api/health/analyze
Stores a new analysis run in the database.

**Request Body:**
```json
{
  "runTimestamp": "2025-11-17T12:00:00Z",
  "overallHealthScore": 85.5,
  "totalProtocolsAnalyzed": 9,
  "protocols": [
    {
      "name": "api_protocol",
      "filePath": "./src/api_protocol_v_1_1_1.js",
      "healthScore": 90.0,
      "analysis": {...}
    }
  ]
}
```

---

## Database Schema

The dashboard uses SQLite with three normalized tables:

### analysis_runs
Stores metadata about each analysis run.

```sql
CREATE TABLE analysis_runs (
    run_id INTEGER PRIMARY KEY,
    run_timestamp INTEGER NOT NULL,
    overall_health_score REAL NOT NULL,
    total_protocols_analyzed INTEGER NOT NULL
);
```

### protocol_definitions
Lookup table for protocol metadata.

```sql
CREATE TABLE protocol_definitions (
    protocol_id INTEGER PRIMARY KEY,
    protocol_name TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL
);
```

### protocol_snapshots
Time-series data for each protocol's health score.

```sql
CREATE TABLE protocol_snapshots (
    snapshot_id INTEGER PRIMARY KEY,
    run_id INTEGER NOT NULL,
    protocol_id INTEGER NOT NULL,
    health_score REAL NOT NULL,
    raw_analysis_output TEXT,
    FOREIGN KEY (run_id) REFERENCES analysis_runs (run_id) ON DELETE CASCADE,
    FOREIGN KEY (protocol_id) REFERENCES protocol_definitions (protocol_id) ON DELETE CASCADE
);
```

---

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Initialize database (if needed)
npm run server:init-db
```

### Running

```bash
# Development mode (Vite dev server)
npm run dev

# Start API server only
npm run server:start

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

---

## Project Structure

```
dashboard/
├── src/
│   ├── components/        # React components
│   │   ├── charts/        # Nivo chart components
│   │   ├── health/        # Health score components
│   │   ├── insights/      # Stale docs & coverage gap components
│   │   ├── layout/        # Layout and navigation
│   │   └── common/        # Reusable UI components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── api/               # API client
│   └── utils/             # Utility functions
├── server/
│   ├── db/                # SQLite client and repository
│   ├── routes/            # Express API routes
│   └── scripts/           # Database initialization
├── tests/                 # Test suite
└── public/                # Static assets
```

---

## Configuration

The dashboard server can be configured via environment variables:

- `NODE_ENV` - `development` or `production` (affects Vite serving mode)
- `DB_PATH` - Path to SQLite database (default: `server/data/dochealth.sqlite`)
- `PORT` - Server port (default: 3000)

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

---

## License

MIT License - See LICENSE file for details
