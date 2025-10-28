#!/bin/bash

# Start script for RDW Local Viewer
# This script starts both servers and opens the viewer in your browser

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║              RDW Local Viewer - Startup Script                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if data files exist
if [ ! -d "data" ] || [ ! "$(ls -A data)" ]; then
    echo "⚠️  WARNING: No data files found!"
    echo ""
    echo "Please run the download script first:"
    echo "  npm run download"
    echo ""
    exit 1
fi

echo "✅ Data files found"
echo ""

echo "🚀 Starting servers..."
echo ""
echo "📍 DuckDB Backend:     http://localhost:3001"
echo "📍 Next.js Frontend:   http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Start both servers using npm run dev
npm run dev
