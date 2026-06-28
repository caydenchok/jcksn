const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const { spawn, execFile } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')

let mainWindow
let serverProcess
const PORT = 3847

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => { server.close(); resolve(false) })
    server.listen(port, '127.0.0.1')
  })
}

function waitForServer(port, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      const req = net.request(`http://127.0.0.1:${port}`)
      req.on('response', () => resolve())
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Server startup timeout'))
        } else {
          setTimeout(check, 1000)
        }
      })
      req.end()
    }
    check()
  })
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
    const resourcesDir = process.resourcesPath
    const serverJs = path.join(resourcesDir, 'server.js')

    if (!fs.existsSync(serverJs)) {
      console.error('server.js not found at:', serverJs)
      return
    }

    serverProcess = spawn(process.execPath, [serverJs], {
      cwd: resourcesDir,
      env: {
        ...process.env,
        PORT: PORT.toString(),
        NODE_ENV: 'production',
        DATABASE_URL: 'file:./dev.db',
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })
  }

  serverProcess.stdout?.on('data', (data) => {
    console.log(`[Server] ${data.toString().trim()}`)
  })

  serverProcess.stderr?.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`)
  })

  serverProcess.on('exit', (code) => {
    console.log(`[Server] exited with code ${code}`)
    if (mainWindow && code !== 0 && code !== null) {
      dialog.showErrorBox('Server Error', `Server process exited with code ${code}. The app may need to be restarted.`)
    }
  })

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err)
    dialog.showErrorBox('Startup Error', `Failed to start server: ${err.message}`)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    title: 'JCKSN - WhatsApp Assistant',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#080808',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  })

  mainWindow.loadURL('about:blank')

  startServer()

  waitForServer(PORT, 60000).then(() => {
    if (mainWindow) {
      mainWindow.loadURL(`http://127.0.0.1:${PORT}`)
      mainWindow.show()
    }
  }).catch((err) => {
    console.error('Server failed to start:', err)
    if (mainWindow) {
      dialog.showErrorBox(
        'Startup Error',
        'Failed to start the application server.\n\nPlease try restarting the application.'
      )
      app.quit()
    }
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
