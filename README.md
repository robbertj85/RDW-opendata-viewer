# 🚗 RDW Open Data Viewer

A professional web application for exploring and analyzing Dutch RDW (Rijksdienst voor het Wegverkeer) vehicle registration data.

## Features

### 🎯 Core Features
- **257 unified fields** from 7 RDW datasets joined on license plate (kenteken)
- **Data Viewer** - Query and explore data with column selection and pivot analysis
- **Advanced Pivot Table** - Drag-and-drop interface with row/column dimensions and filtering
- **License Plate Lookup** - Retrieve complete vehicle information by license plate
- **Status Dashboard** - System health monitoring and dataset information
- **Modern UI** - Built with Next.js 16, TypeScript, and Tailwind CSS v4

### 📊 Query Capabilities
1. **Unique Values** - Get all unique values for any column
2. **Count by Value** - Count records grouped by value
3. **Pivot Analysis** - Multi-dimensional cross-tabulation with filtering
4. **License Plate Search** - Lookup all available data for specific vehicles

### 🗂️ Datasets Included
- Gekentekende Voertuigen (main) - `m9d7-ebf2`
- Brandstof (fuel types) - `8ys7-d773`
- Carrosserie (body types) - `vezc-m2t6`
- Carrosserie Specifiek (specific body types) - `jhie-znh9`
- Voertuigklasse (vehicle classes) - `kmfi-hrps`
- Assen (axles) - `3huj-srit`
- Gebreken (defects) - `w4rt-e856`

## Setup

### 1. Install Dependencies

```bash
npm install
cd rdw-app
npm install
```

### 2. Download RDW Data

The application provides two methods to download RDW CSV datasets:

**Method 1: Via Web Interface (Recommended)**
1. Start the backend server (see step 3)
2. Open the application (see step 4)
3. Navigate to the **Status** tab
4. Click the **"Download Datasets"** button if data is missing
5. Monitor real-time download progress in the UI

**Method 2: Via Command Line**

For smart delta downloads (only downloads if files are updated):
```bash
npm run download
# or
node download-rdw-data-smart.js
```

For full parallel downloads (always downloads all missing files):
```bash
npm run download-all
# or
node download-rdw-data-parallel.js
```

**Delta Download Support:**
- The smart downloader checks `Last-Modified` and `ETag` headers from the RDW API
- Only downloads files that have been updated on the server
- Saves download metadata in `data/.download-metadata.json`
- Significantly reduces download time and bandwidth for updates

Data will be downloaded to the `data/` directory (~5-10 GB total).

### 3. Start the Backend Server

```bash
node local-query-server-duckdb.js
```

The DuckDB backend server will start on http://localhost:3001 and automatically create a unified view joining all datasets.

### 4. Start the Next.js App

In a separate terminal:

```bash
cd rdw-app
npm run dev
```

The Next.js application will start on http://localhost:3000 (or 3003 if 3000 is taken).

### 5. Open the Application

Navigate to http://localhost:3000 in your browser.

## Usage

### Data Viewer

1. Select a column from the 257 available fields
2. Choose query type (Unique Values or Count by Value)
3. Optionally add a pivot column for cross-tabulation
4. Set result limit
5. Click "Execute Query"
6. Copy results as JSON for further analysis

### Pivot Table

1. Drag fields to Rows, Columns, or Values areas
2. Add filters to narrow down results
3. Set aggregation function (COUNT DISTINCT by default)
4. Click "Run Analysis"
5. View SQL query and execution details
6. Export results in CSV, TSV, or JSON format

### License Plate Lookup

1. Enter a Dutch license plate (e.g., "12-ABC-3")
2. View all 257 available fields for that vehicle
3. Data is organized with row numbers for easy reference
4. Export as Text, CSV, or JSON

### Status Dashboard

Monitor system health and manage data downloads:
- **DuckDB server status** - Connection state and backend health
- **Dataset availability** - View which datasets are available locally
- **Download manager** - One-click download of missing datasets with real-time progress
- **Delta download support** - Automatically skip files that are already up-to-date
- **File sizes and metadata** - Last modified dates and storage usage

## Architecture

```
┌─────────────────────┐
│   Browser           │
│  (Next.js App)      │
└──────────┬──────────┘
           │
           │ HTTP Requests
           ▼
┌─────────────────────┐
│  Next.js API Routes │
│  (Port 3000/3003)   │
└──────────┬──────────┘
           │
           │ Backend Queries
           ▼
┌─────────────────────┐
│  DuckDB Server      │
│  (Port 3001)        │
└──────────┬──────────┘
           │
           │ SQL Queries
           ▼
┌─────────────────────┐
│   CSV Data Files    │
│   (data/ dir)       │
└─────────────────────┘
```

## Technical Stack

**Frontend:**
- Next.js 16 with Turbopack
- TypeScript
- Tailwind CSS v4
- shadcn/ui components

**Backend:**
- Node.js + Express
- DuckDB (high-performance analytical queries)
- Direct CSV querying (no data loading required)

**Features:**
- Unified view joining 7 datasets on kenteken
- Columnar storage for fast aggregations
- Multi-core parallelization
- Low memory footprint (~6GB limit)

## Data Model

All datasets are joined on `kenteken` (license plate) in a unified view:

- **VOERTUIGEN** (m9d7-ebf2) - Main vehicle registration table
- **BRANDSTOF** (8ys7-d773) - Links via kenteken
- **CARROSSERIE** (vezc-m2t6) - Links via kenteken
- **CARROSSERIE SPECIFIEK** (jhie-znh9) - Links via kenteken + carrosserie_volgnummer
- **VOERTUIGKLASSE** (kmfi-hrps) - Links via kenteken + carrosserie_volgnummer
- **ASSEN** (3huj-srit) - Links via kenteken
- **GEBREKEN** (w4rt-e856) - Standalone reference table

## Troubleshooting

### Backend won't start
- Check if port 3001 is available: `lsof -i :3001`
- Kill existing process: `kill -9 <PID>`
- Ensure data files are downloaded in `data/` directory

### Frontend won't start
- Check if port 3000/3003 is available
- Ensure backend is running first
- Check `.next/` build cache (delete if needed)

### No data showing
- Verify backend server is running on port 3001
- Check browser console for API errors
- Ensure CSV files were downloaded successfully

### Slow queries
- DuckDB automatically optimizes queries
- Large result sets may take time (use LIMIT to test)
- Check DuckDB memory settings in `local-query-server-duckdb.js`

## Development

### Adding new features

Frontend components are in `rdw-app/app/`:
- `/viewer` - Data viewer page
- `/pivot` - Pivot table page
- `/kenteken` - License plate lookup page
- `/status` - Status dashboard

API routes are in `rdw-app/app/api/`:
- `/query` - Execute data queries
- `/pivot-advanced` - Execute pivot queries
- `/schema` - Get unified schema
- `/status` - Get system status

### Modifying the backend

Edit `local-query-server-duckdb.js` to:
- Adjust memory limits
- Add new query endpoints
- Modify unified view structure

## Quick Start Script

Use the convenience script to start both servers:

```bash
./start.sh
```

This will:
1. Start the DuckDB backend server
2. Wait for it to be ready
3. Start the Next.js development server

## License

MIT - Free to use and modify

## Data Source

Data is sourced from the Dutch RDW Open Data API:
https://opendata.rdw.nl/

The RDW (Rijksdienst voor het Wegverkeer) provides open access to vehicle registration data for the Netherlands.
