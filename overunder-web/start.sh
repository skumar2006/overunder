#!/bin/bash

echo "🚀 Starting OverUnder Web Platform..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🌐 Starting development server..."
echo "📍 Open http://localhost:3000 in your browser"
echo ""

npm run dev 