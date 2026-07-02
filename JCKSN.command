#!/bin/zsh
# JCKSN WhatsApp Assistant — double-click to start.
# First run: installs dependencies, creates the database, builds the app.
# After that: starts in seconds and opens your browser.
# Keep this window open (minimized is fine) — closing it stops the WhatsApp bot.

cd "$(dirname "$0")" || exit 1

PORT=3000
URL="http://localhost:$PORT"

banner() { echo ""; echo "════════════════════════════════════════════"; echo "  $1"; echo "════════════════════════════════════════════"; }

banner "JCKSN WhatsApp Assistant"

# --- 1. Node.js check ---------------------------------------------------
# (Homebrew and nodejs.org install locations aren't always on a .command's PATH)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed."
  echo "   Opening the download page — install the LTS version, then run me again."
  osascript -e 'display alert "Node.js required" message "JCKSN needs Node.js to run.\n\nInstall the LTS version from the page that just opened, then double-click JCKSN again." as critical' >/dev/null 2>&1
  open "https://nodejs.org"
  exit 1
fi
echo "✓ Node $(node --version)"

# --- 2. Already running? Just open the browser --------------------------
if curl -s -o /dev/null "$URL"; then
  echo "✓ JCKSN is already running — opening your browser"
  open "$URL"
  exit 0
fi

# --- 3. Ollama (optional local AI fallback) ------------------------------
# The bot uses DeepSeek first; Ollama only answers when DeepSeek is down.
# Never block the app on it.
if command -v ollama >/dev/null 2>&1; then
  if ! curl -s -o /dev/null http://localhost:11434/api/tags; then
    echo "✓ Starting Ollama (local AI fallback)"
    nohup ollama serve >/dev/null 2>&1 &
    disown
  else
    echo "✓ Ollama already running"
  fi
  # make sure the model is available (downloads in background, ~2GB first time)
  ( sleep 3
    if ! ollama list 2>/dev/null | grep -q llama3.2; then
      echo "… downloading llama3.2 AI model in the background (one time, ~2GB)"
      ollama pull llama3.2 >/dev/null 2>&1
    fi
  ) &
  disown
elif command -v brew >/dev/null 2>&1; then
  echo "… Installing Ollama via Homebrew (optional AI fallback, one time)"
  if brew install ollama >/dev/null 2>&1; then
    nohup ollama serve >/dev/null 2>&1 &
    disown
    ( sleep 3; ollama pull llama3.2 >/dev/null 2>&1 ) &
    disown
    echo "✓ Ollama installed"
  else
    echo "ℹ Ollama install failed — continuing without it (optional)."
  fi
else
  echo "ℹ Optional: install Ollama from https://ollama.com for an offline AI fallback"
fi

# --- 4. First-run setup --------------------------------------------------
if [ ! -d node_modules ]; then
  banner "First-time setup 1/3 — installing (a few minutes)"
  npm install || { echo "❌ Install failed. Check your internet connection and try again."; read -k 1 "?Press any key to close..."; exit 1; }
fi

if [ ! -f dev.db ]; then
  banner "First-time setup 2/3 — creating your database"
  npx prisma db push --skip-generate || { echo "❌ Database setup failed."; read -k 1 "?Press any key to close..."; exit 1; }
fi

if [ ! -f .next/BUILD_ID ]; then
  banner "First-time setup 3/3 — building the app (1-2 minutes)"
  npm run build || { echo "❌ Build failed."; read -k 1 "?Press any key to close..."; exit 1; }
fi

# --- 5. Start the server -------------------------------------------------
banner "Starting JCKSN on $URL"
npm start &
SERVER_PID=$!

# stop the server when this window closes / Ctrl+C
cleanup() { kill $SERVER_PID 2>/dev/null; exit 0 }
trap cleanup INT TERM HUP

# wait until it responds, then open the browser
for i in {1..60}; do
  if curl -s -o /dev/null "$URL"; then break; fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then echo "❌ Server stopped unexpectedly."; read -k 1 "?Press any key to close..."; exit 1; fi
  sleep 1
done

echo ""
echo "✓ Dashboard:      $URL"
echo "✓ Public site:    $URL/p"
echo ""
echo "Keep this window open (minimize it) — closing it stops the WhatsApp bot."
open "$URL"

wait $SERVER_PID
