# 🚀 Quick Start Guide - Local RDW Data

**Problem:** Getting 400 errors from the RDW API? Rate limits hitting you?

**Solution:** Download all RDW data locally and query it without limits!

## Step-by-Step Setup

### 1️⃣ Install Dependencies

```bash
cd /Users/robbertjanssen/Documents/dev/rdw-opendata
npm install
```

### 2️⃣ Download RDW Datasets

**This downloads ~5-10 GB to your computer** (will take 15-60 minutes):

```bash
npm run download
```

You'll see progress for each dataset:
```
📥 Downloading: Main vehicle registration (15+ million records)
   Dataset ID: m9d7-ebf2
   Estimated size: ~3-5 GB
⏳ Progress: 45.3% (1.2 GB / 2.7 GB)
```

**What gets downloaded:**
- `gekentekende_voertuigen.csv` - 15M+ records (~3-5 GB)
- `brandstof.csv` - Fuel/emissions data (~500 MB)
- `carrosserie.csv` - Body types (~100 MB)
- `carrosserie_specifiek.csv` - Body details (~100 MB)
- `voertuigklasse.csv` - Vehicle classes (~50 MB)
- `assen.csv` - Axle info (~200 MB)
- `gebreken.csv` - Inspection defects (~500 MB)

All files saved to: `/Users/robbertjanssen/Documents/dev/rdw-opendata/data/`

### 3️⃣ Start the Local Query Server

**Terminal 1** - Local data server (port 3001):
```bash
npm run local-server
```

**Terminal 2** - Claude AI server (port 3000):
```bash
npm start
```

Or run both at once:
```bash
npm run dev
```

### 4️⃣ Update the Viewer

Open `rdw-viewer.html` in a text editor and find line ~384:

```javascript
const API_BASE = 'https://opendata.rdw.nl/resource/';
```

Change it to:

```javascript
const API_BASE = 'http://localhost:3001/resource/';
```

Save the file.

### 5️⃣ Open the Viewer

```bash
open rdw-viewer.html
```

## ✅ You're Done!

Now you can:
- ✅ Query **15+ million records** without rate limits
- ✅ Use AI-powered natural language queries
- ✅ Get **instant results** (no API delays)
- ✅ Work **offline**
- ✅ No more 400 errors!

## Example Queries to Try

Once everything is running, try these in the AI prompt:

```
"Hoeveel Tesla's zijn er in Nederland?"
"Top 10 automerken"
"Toon alle emissieklassen"
"Hoeveel elektrische auto's zijn er?"
"Aantal voertuigen per carrosserietype"
```

## Troubleshooting

**Download fails:**
- Check internet connection
- Check disk space (~10 GB free needed)
- Restart: `npm run download`

**"Dataset file not found" error:**
- Make sure download completed successfully
- Check `data/` folder exists and has CSV files
- Re-run: `npm run download`

**Queries are slow:**
- Normal for first query (loading data)
- Subsequent queries should be fast
- Main dataset has 15M rows - counts take 10-30 seconds

**Viewer shows 400 errors:**
- Did you update `API_BASE` in `rdw-viewer.html`?
- Is local-query-server running on port 3001?
- Check: `http://localhost:3001/health`

## Performance

**Query speeds (local vs API):**
- API: 2-10 seconds (with rate limits)
- Local: 5-30 seconds (no limits, can process all 15M rows)

**First query per session:** ~30 seconds (loading data into memory)
**Subsequent queries:** 5-15 seconds

## Next Steps

1. Start downloading: `npm run download`
2. Make coffee ☕ (this will take a while)
3. Start servers: `npm run dev`
4. Update viewer API endpoint
5. Start querying!

🎉 Enjoy unlimited RDW data access!
