const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const { spawn, execFile, exec, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')

let mainWindow
let serverProcess
let ollamaProcess
const PORT = 3847

async function waitForServer(port, timeout = 60000) {
  const http = require('http')
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      // Check if server process is still alive
      if (serverProcess && serverProcess.exitCode !== null) {
        reject(new Error('Server process died'))
        return
      }
      http.get(`http://127.0.0.1:${port}`, (res) => {
        resolve()
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Server startup timeout'))
        } else {
          setTimeout(check, 1000)
        }
      })
    }
    // Wait 2 seconds before first check to let server start
    setTimeout(check, 2000)
  })
}

function waitForServer(port, timeout = 60000) {
  const http = require('http')
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      http.get(`http://127.0.0.1:${port}`, (res) => {
        resolve()
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Server startup timeout'))
        } else {
          setTimeout(check, 1000)
        }
      })
    }
    check()
  })
}

// Check if Ollama is installed
function isOllamaInstalled() {
  return new Promise((resolve) => {
    exec('ollama --version', (error) => {
      resolve(!error)
    })
  })
}

// Check if Ollama is running
async function isOllamaRunning() {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    return res.ok
  } catch {
    return false
  }
}

// Start Ollama server
function startOllama() {
  return new Promise((resolve) => {
    ollamaProcess = spawn('ollama', ['serve'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    ollamaProcess.stdout?.on('data', (data) => {
      console.log(`[Ollama] ${data.toString().trim()}`)
    })
    
    ollamaProcess.stderr?.on('data', (data) => {
      console.log(`[Ollama] ${data.toString().trim()}`)
    })
    
    // Wait a bit for Ollama to start
    setTimeout(() => resolve(true), 2000)
  })
}

// Install Ollama if not present
async function ensureOllamaInstalled() {
  const installed = await isOllamaInstalled()
  if (!installed) {
    console.log('[Ollama] Not installed. Attempting auto-install...')
    
    const platform = process.platform
    try {
      if (platform === 'darwin') {
        // Mac: download and install via curl
        console.log('[Ollama] Downloading for macOS...')
        execSync('curl -fsSL https://ollama.com/install.sh | sh', { timeout: 120000 })
        console.log('[Ollama] Installed successfully!')
      } else if (platform === 'win32') {
        // Windows: download installer
        console.log('[Ollama] Downloading for Windows...')
        const { execSync } = require('child_process')
        const installerPath = path.join(app.getPath('temp'), 'OllamaSetup.exe')
        execSync(`curl -L -o "${installerPath}" "https://ollama.com/download/OllamaSetup.exe"`, { timeout: 120000 })
        execSync(`"${installerPath}" /VERYSILENT /NORESTART`, { timeout: 120000 })
        console.log('[Ollama] Installed successfully!')
      } else {
        // Linux
        console.log('[Ollama] Downloading for Linux...')
        execSync('curl -fsSL https://ollama.com/install.sh | sh', { timeout: 120000 })
        console.log('[Ollama] Installed successfully!')
      }
    } catch (e) {
      console.log('[Ollama] Auto-install failed:', e.message)
      console.log('[Ollama] Please install manually from https://ollama.com')
      console.log('[Ollama] The app will use DeepSeek as primary AI provider.')
      return false
    }
  }
  
  const running = await isOllamaRunning()
  if (!running) {
    console.log('[Ollama] Starting Ollama server...')
    await startOllama()
    
    // Pull llama3.2 model if not present
    try {
      console.log('[Ollama] Checking for llama3.2 model...')
      const res = await fetch('http://localhost:11434/api/tags')
      const data = await res.json()
      const hasModel = data.models?.some(m => m.name?.includes('llama3.2'))
      if (!hasModel) {
        console.log('[Ollama] Pulling llama3.2 model (this may take a few minutes)...')
        exec('ollama pull llama3.2', (err) => {
          if (err) console.log('[Ollama] Model pull failed:', err.message)
          else console.log('[Ollama] llama3.2 model ready!')
        })
      }
    } catch (e) {
      console.log('[Ollama] Model check failed:', e.message)
    }
  }
  
  return true
}

function startServer() {
  const isDev = !app.isPackaged

  if (isDev) {
    const serverDir = path.join(__dirname, '..')
    serverProcess = spawn('node', ['server.js'], {
      cwd: serverDir,
      env: { ...process.env, PORT: PORT.toString(), NODE_ENV: 'development' },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })
  } else {
    // In production, server.js is in the standalone directory
    const serverDir = path.join(process.resourcesPath, 'app', '.next', 'standalone')
    const serverJs = path.join(serverDir, 'server.js')

    if (!fs.existsSync(serverJs)) {
      try { process.stderr.write(`[Server] server.js not found at: ${serverJs}\n`) } catch {}
      return
    }

    try { process.stdout.write(`[Server] Starting from: ${serverJs}\n`) } catch {}

    // Find system Node.js
    const { execSync } = require('child_process')
    let nodeBin = 'node'
    try {
      nodeBin = execSync('which node', { encoding: 'utf8' }).trim()
    } catch {}

    // Copy static files to standalone directory if not present
    const standaloneNextDir = path.join(serverDir, '.next')
    const staticSourceDir = path.join(process.resourcesPath, 'app', '.next', 'static')
    const staticTargetDir = path.join(standaloneNextDir, 'static')
    if (!fs.existsSync(path.join(staticTargetDir, 'chunks')) && fs.existsSync(staticSourceDir)) {
      try { process.stdout.write('[Server] Copying static files...\n') } catch {}
      execSync(`cp -r "${staticSourceDir}" "${staticTargetDir}"`, { timeout: 30000 })
      // Also copy public directory
      const publicSource = path.join(process.resourcesPath, 'app', 'public')
      const publicTarget = path.join(serverDir, 'public')
      if (fs.existsSync(publicSource) && !fs.existsSync(publicTarget)) {
        execSync(`cp -r "${publicSource}" "${publicTarget}"`, { timeout: 10000 })
      }
    }

    // Copy extra resources to standalone directory
    const resourcesDir = process.resourcesPath
    const envSource = path.join(resourcesDir, '.env')
    const envTarget = path.join(serverDir, '.env')
    const dbSource = path.join(resourcesDir, 'dev.db')
    const dbTarget = path.join(serverDir, 'dev.db')
    const waSource = path.join(resourcesDir, 'whatsapp-auth')
    const waTarget = path.join(serverDir, 'whatsapp-auth')

    // Always copy to ensure latest files
    try {
      if (fs.existsSync(envSource)) execSync(`cp -f "${envSource}" "${envTarget}"`, { timeout: 5000 })
      if (fs.existsSync(dbSource)) execSync(`cp -f "${dbSource}" "${dbTarget}"`, { timeout: 5000 })
      if (fs.existsSync(waSource)) execSync(`cp -rf "${waSource}" "${waTarget}"`, { timeout: 10000 })
    } catch (e) {
      try { process.stderr.write(`[Server] Copy error: ${e.message}\n`) } catch {}
    }

    serverProcess = spawn(nodeBin, [serverJs], {
      cwd: serverDir,
      env: {
        ...process.env,
        PORT: PORT.toString(),
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: `file:${dbTarget}`,
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })
  }

  serverProcess.stdout?.on('data', (data) => {
    try { process.stdout.write(`[Server] ${data.toString().trim()}\n`) } catch {}
  })

  serverProcess.stderr?.on('data', (data) => {
    try { process.stderr.write(`[Server Error] ${data.toString().trim()}\n`) } catch {}
  })

  serverProcess.on('exit', (code) => {
    try { process.stdout.write(`[Server] exited with code ${code}\n`) } catch {}
  })

  serverProcess.on('error', (err) => {
    try { process.stderr.write(`Failed to start server: ${err.message}\n`) } catch {}
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    title: 'JCKSN',
    icon: path.join(__dirname, '..', 'public', 'icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#080808',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: true,
    visible: true
  })

  mainWindow.loadURL('about:blank')

  // Ensure Ollama is installed and running before starting server
  ensureOllamaInstalled().then(() => {
    startServer()
    
    waitForServer(PORT, 60000).then(() => {
      if (mainWindow) {
        mainWindow.loadURL(`http://127.0.0.1:${PORT}`)
        mainWindow.show()
        mainWindow.focus()
      }
    }).catch((err) => {
      try { process.stderr.write(`Server failed to start: ${err.message}\n`) } catch {}
      if (mainWindow) {
        try {
          dialog.showErrorBox(
            'Startup Error',
            'Failed to start the application server.\n\nPlease try restarting the application.'
          )
        } catch {}
        app.quit()
      }
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function killServer() {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM')
      setTimeout(() => {
        try { serverProcess.kill('SIGKILL') } catch {}
      }, 3000)
    } catch {}
    serverProcess = null
  }
  
  if (ollamaProcess) {
    try {
      ollamaProcess.kill('SIGTERM')
      setTimeout(() => {
        try { ollamaProcess.kill('SIGKILL') } catch {}
      }, 3000)
    } catch {}
    ollamaProcess = null
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  killServer()
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  killServer()
})

process.on('SIGINT', () => { killServer(); app.quit() })
process.on('SIGTERM', () => { killServer(); app.quit() })
