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

# Open the viewer in the default browser
echo "🌐 Opening rdw-viewer.html in your browser..."
open rdw-viewer.html
echo ""

# Give browser a moment to open
sleep 2

echo "🚀 Starting servers..."
echo ""
echo "📍 Local Query Server: http://localhost:3001"
echo "📍 Claude AI Server:   http://localhost:3000"
echo "📍 Viewer:             rdw-viewer.html"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Start both servers using npm run dev
npm run dev
