#!/bin/bash

echo "🔍 Verifying Ollama Setup for RDW App"
echo "======================================"
echo ""

# Check if Ollama is installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is installed"
else
    echo "❌ Ollama is NOT installed"
    exit 1
fi

# Check if Ollama server is running
if curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "✅ Ollama server is running on port 11434"
else
    echo "⚠️  Ollama server is NOT running"
    echo "   Start it with: ollama serve"
fi

# Check if gemma3:4b model is available
if ollama list | grep -q "gemma3:4b"; then
    echo "✅ gemma3:4b model is installed"
    ollama list | grep "gemma3:4b"
else
    echo "❌ gemma3:4b model is NOT installed"
    echo "   Install it with: ollama pull gemma3:4b"
    exit 1
fi

echo ""
echo "📋 Configuration Summary"
echo "========================"
echo ""

# Extract default model from ollama-server.js
DEFAULT_MODEL=$(grep -o "model = '[^']*'" ollama-server.js | head -1 | sed "s/model = '//;s/'//")
echo "Default model in ollama-server.js: $DEFAULT_MODEL"

echo ""
echo "🚀 Ready to start!"
echo "=================="
echo ""
echo "Start the full app:     npm run dev"
echo "Start Ollama server:    npm start"
echo "Start with Claude:      npm run dev-claude"
echo ""
