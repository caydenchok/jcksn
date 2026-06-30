'use client'

import { useEffect, useState, useRef, useCallback, ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import QRCode from 'qrcode'

interface WhatsAppStatus {
  status: 'disconnected' | 'connecting' | 'connected'
  qr: string | null
}

interface BotConfig {
  welcomeMessage: string
  enabledCommands: string[]
}

const ALL_COMMANDS = [
  { id: 'talk', name: '/talk', desc: 'Talk to agent directly' },
  { id: 'booking', name: '/booking', desc: 'Book a viewing' },
  { id: 'property', name: '/property', desc: 'View all properties' },
  { id: 'rent', name: '/rent', desc: 'Rental properties' },
  { id: 'buy', name: '/buy', desc: 'Properties for sale' },
  { id: 'new', name: '/new', desc: 'Latest listings' },
  { id: 'price', name: '/price', desc: 'View by price' },
  { id: 'search', name: '/search', desc: 'Search tips' },
  { id: 'agent', name: '/agent', desc: 'Agent info' },
  { id: 'contact', name: '/contact', desc: 'Contact details' },
  { id: 'help', name: '/help', desc: 'Show all commands' },
]

function QRDisplay({ qrData }: { qrData: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  const generateQR = useCallback(async () => {
    if (!canvasRef.current) return
    try {
      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
      setError(false)
    } catch {
      setError(true)
    }
  }, [qrData])

  useEffect(() => {
    generateQR()
  }, [generateQR])

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-white/5 text-sm text-zinc-400 max-w-[280px] break-all font-mono">
        {qrData}
      </div>
    )
  }

  return <canvas ref={canvasRef} className="mx-auto rounded-xl shadow-lg" />
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus>({
    status: 'disconnected',
    qr: null,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [config, setConfig] = useState<BotConfig>({
    welcomeMessage: '',
    enabledCommands: ['talk', 'booking', 'property', 'rent', 'buy', 'new', 'price', 'search', 'agent', 'contact', 'help'],
  })

  useEffect(() => {
    fetchStatus()
    fetchConfig()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/whatsapp')
      const data = await res.json()
      setStatus(data)
      if (data.status === 'connected') {
        setIsConnecting(false)
      }
      return data
    } catch (error) {
      console.error('Failed to fetch status:', error)
      return { status: 'disconnected', qr: null }
    }
  }

  async function fetchConfig() {
    try {
      const res = await fetch('/api/agent')
      const data = await res.json()
      if (data) {
        setConfig({
          welcomeMessage: data.welcomeMsg || '',
          enabledCommands: data.enabledCommands ? JSON.parse(data.enabledCommands) : ALL_COMMANDS.map(c => c.id),
        })
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    }
  }

  async function saveConfig() {
    try {
      await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent',
          phone: '',
          welcomeMsg: config.welcomeMessage,
          enabledCommands: JSON.stringify(config.enabledCommands),
        }),
      })
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  function toggleCommand(commandId: string) {
    setConfig(prev => ({
      ...prev,
      enabledCommands: prev.enabledCommands.includes(commandId)
        ? prev.enabledCommands.filter(c => c !== commandId)
        : [...prev.enabledCommands, commandId],
    }))
  }

  async function connectWhatsApp() {
    setIsConnecting(true)
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
    } catch (error) {
      console.error('Failed to connect:', error)
      setIsConnecting(false)
    }
  }

  async function disconnectWhatsApp() {
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })
      setStatus({ status: 'disconnected', qr: null })
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="px-10 pt-10 pb-10">
        <div className="mb-10">
          <h1 className="text-5xl font-bold tracking-tight text-white">WhatsApp</h1>
          <p className="text-zinc-500 mt-2 text-base">Connect your WhatsApp to start receiving messages</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Card */}
          <Card className="bg-[#0c0c0c] border-white/[0.04]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  status.status === 'connected' ? 'bg-emerald-500' :
                  isConnecting ? 'bg-amber-500 animate-pulse' :
                  'bg-zinc-600'
                }`} />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`px-5 py-2.5 rounded-xl font-medium text-sm ${
                  status.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                  isConnecting ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                  'bg-white/5 text-zinc-500 border border-white/5'
                }`}>
                  {status.status === 'connected' ? 'Connected' :
                   isConnecting ? 'Connecting...' :
                   'Disconnected'}
                </div>
              </div>

              <div className="flex gap-3">
                {status.status === 'connected' ? (
                  <Button
                    onClick={disconnectWhatsApp}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold h-11 rounded-xl border border-red-500/20"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    onClick={connectWhatsApp}
                    disabled={isConnecting}
                    className="flex-1 bg-white hover:bg-zinc-200 text-black font-semibold h-11 rounded-xl"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect WhatsApp'}
                  </Button>
                )}
              </div>

              <div className="p-4 rounded-xl bg-white/5 text-sm text-zinc-400 border border-white/5">
                <p className="font-medium text-white mb-3">How to connect:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Click &quot;Connect WhatsApp&quot; button above</li>
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Scan the QR code shown here</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-white/5 text-sm text-zinc-400 border border-white/5">
                <p className="font-medium text-white mb-3">Available Commands:</p>
                <div className="space-y-1.5">
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/talk</code> - Talk to agent directly</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/booking</code> - Book a viewing</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/property</code> - View all properties</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/rent</code> - Rental properties</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/buy</code> - Properties for sale</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/new</code> - Latest listings</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/price</code> - View by price</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/search</code> - Search tips</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/agent</code> - Agent info</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/contact</code> - Contact details</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/help</code> - Show all commands</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Card */}
          <Card className="bg-[#0c0c0c] border-white/[0.04]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">QR Code</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[350px]">
              {status.status === 'connected' ? (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white font-semibold text-lg">WhatsApp Connected!</p>
                  <p className="text-sm text-zinc-500 mt-2">Your AI assistant is ready to reply</p>
                </div>
              ) : isConnecting && status.qr ? (
                <div className="text-center">
                  <QRDisplay qrData={status.qr} />
                  <p className="text-sm text-zinc-500 mt-4">Scan this QR code with WhatsApp</p>
                </div>
              ) : isConnecting && !status.qr ? (
                <div className="text-center">
                  <div className="w-12 h-12 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-zinc-400">Generating QR code...</p>
                </div>
              ) : (
                <div className="text-center text-zinc-500">
                  <svg className="w-20 h-20 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <p>Click &quot;Connect WhatsApp&quot; to generate QR code</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bot Settings */}
        <div className="mt-6">
          <Card className="bg-[#0c0c0c] border-white/[0.04]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Bot Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Welcome Message */}
              <div>
                <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">First Response / Welcome Message</Label>
                <p className="text-xs text-zinc-600 mt-1 mb-2">This is what the bot says when a customer says hi or hello</p>
                <textarea
                  value={config.welcomeMessage}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                  placeholder="Hi! I'm [Your Name], your property assistant. How can I help you today?"
                  className="w-full h-24 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                />
              </div>

              {/* Command Toggles */}
              <div>
                <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Enabled Commands</Label>
                <p className="text-xs text-zinc-600 mt-1 mb-3">Toggle which commands are available to customers</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ALL_COMMANDS.map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={() => toggleCommand(cmd.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        config.enabledCommands.includes(cmd.id)
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 border-white/5 text-zinc-500'
                      }`}
                    >
                      <p className="font-medium text-sm">{cmd.name}</p>
                      <p className="text-xs opacity-70 mt-0.5">{cmd.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={saveConfig} className="w-full bg-white hover:bg-zinc-200 text-black font-semibold h-11 rounded-xl">
                Save Bot Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
