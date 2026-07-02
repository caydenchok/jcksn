@echo off
REM JCKSN WhatsApp Assistant - double-click to start.
REM First run: installs dependencies, creates the database, builds the app.
REM Keep this window open (minimized is fine) - closing it stops the WhatsApp bot.

cd /d "%~dp0"
set PORT=3000
set URL=http://localhost:%PORT%

title JCKSN WhatsApp Assistant
echo.
echo ============================================
echo   JCKSN WhatsApp Assistant
echo ============================================

REM --- 1. Node.js check ---
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Opening the download page - install the LTS version, then run me again.
  start https://nodejs.org
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo Node %%v found

REM --- 2. Already running? Just open the browser ---
curl -s -o nul %URL% 2>nul
if not errorlevel 1 (
  echo JCKSN is already running - opening your browser
  start %URL%
  exit /b 0
)

REM --- 3. Ollama (optional local AI fallback) ---
REM The bot uses DeepSeek first; Ollama only answers when DeepSeek is down.
REM Auto-installs silently on first run; never blocks the app if it fails.
set "PATH=%LOCALAPPDATA%\Programs\Ollama;%PATH%"
where ollama >nul 2>nul
if errorlevel 1 (
  echo.
  echo Ollama not found - downloading it for offline AI fallback, a few minutes...
  curl -L -o "%TEMP%\OllamaSetup.exe" "https://ollama.com/download/OllamaSetup.exe"
  if not errorlevel 1 (
    echo Installing Ollama silently...
    "%TEMP%\OllamaSetup.exe" /VERYSILENT /NORESTART
    set "PATH=%LOCALAPPDATA%\Programs\Ollama;%PATH%"
  ) else (
    echo Could not download Ollama - continuing without it. Optional install: https://ollama.com
  )
)
where ollama >nul 2>nul
if not errorlevel 1 (
  curl -s -o nul http://localhost:11434/api/tags 2>nul
  if errorlevel 1 start "" /b ollama serve
  REM download the AI model in the background if missing, one time ~2GB
  start "" /b cmd /c "ollama list 2>nul | findstr llama3.2 >nul || ollama pull llama3.2"
  echo Ollama ready
)

REM --- 4. First-run setup ---
if not exist node_modules (
  echo.
  echo First-time setup 1/3 - installing dependencies, a few minutes...
  call npm install
  if errorlevel 1 ( echo Install failed. Check your internet connection. & pause & exit /b 1 )
)

if not exist dev.db (
  echo.
  echo First-time setup 2/3 - creating your database...
  call npx prisma db push --skip-generate
  if errorlevel 1 ( echo Database setup failed. & pause & exit /b 1 )
)

if not exist .next\BUILD_ID (
  echo.
  echo First-time setup 3/3 - building the app, 1-2 minutes...
  call npm run build
  if errorlevel 1 ( echo Build failed. & pause & exit /b 1 )
)

REM --- 5. Start the server, open browser when ready ---
echo.
echo Starting JCKSN on %URL% ...
start /b npm start

set tries=0
:waitloop
timeout /t 1 /nobreak >nul
curl -s -o nul %URL% 2>nul
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% lss 60 goto waitloop
echo Server did not start in time.
pause
exit /b 1

:ready
echo.
echo   Dashboard:    %URL%
echo   Public site:  %URL%/p
echo.
echo Keep this window open (minimize it) - closing it stops the WhatsApp bot.
start %URL%

REM keep window alive; closing it kills the child node process
pause >nul
