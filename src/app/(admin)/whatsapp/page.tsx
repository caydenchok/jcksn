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
  const [activeTab, setActiveTab] = useState<'connection' | 'settings'>('connection')
  const [status, setStatus] = useState<WhatsAppStatus>({ status: 'disconnected', qr: null })
  const [isConnecting, setIsConnecting] = useState(false)
  const [config, setConfig] = useState<BotConfig>({
    welcomeMessage: '',
    enabledCommands: ALL_COMMANDS.map(c => c.id),
  })
  const [saved, setSaved] = useState<'idle' | 'success' | 'error'>('idle')

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
      if (data.status === 'connected') setIsConnecting(false)
      return data
    } catch {
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
    } catch {}
  }

  async function saveConfig() {
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcomeMsg: config.welcomeMessage,
          enabledCommands: JSON.stringify(config.enabledCommands),
        }),
      })
      if (res.ok) {
        setSaved('success')
        setTimeout(() => setSaved('idle'), 3000)
      } else {
        setSaved('error')
        setTimeout(() => setSaved('idle'), 3000)
      }
    } catch {
      setSaved('error')
      setTimeout(() => setSaved('idle'), 3000)
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
    } catch {
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
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="px-4 sm:px-6 lg:px-10 pt-10 pb-10">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">WhatsApp</h1>
            <p className="text-zinc-500 mt-2 text-base">Connect and configure your WhatsApp bot</p>
          </div>
          {activeTab === 'settings' && (
            <button
              onClick={saveConfig}
              disabled={saved === 'success'}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                saved === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                  : saved === 'error'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30'
                  : 'bg-white hover:bg-zinc-200 text-black'
              }`}
            >
              {saved === 'success' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Saved!
                </>
              ) : saved === 'error' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Failed — Retry
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          )}
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-8 max-w-md">
          <button
            onClick={() => setActiveTab('connection')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'connection'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Connection
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Bot Settings
          </button>
        </div>

        {/* Connection Tab */}
        {activeTab === 'connection' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className={`px-5 py-2.5 rounded-xl font-medium text-sm w-fit ${
                  status.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                  isConnecting ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                  'bg-white/5 text-zinc-500 border border-white/5'
                }`}>
                  {status.status === 'connected' ? 'Connected' :
                   isConnecting ? 'Connecting...' : 'Disconnected'}
                </div>

                <div className="flex gap-3">
                  {status.status === 'connected' ? (
                    <Button onClick={disconnectWhatsApp} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold h-11 rounded-xl border border-red-500/20">
                      Disconnect
                    </Button>
                  ) : (
                    <Button onClick={connectWhatsApp} disabled={isConnecting} className="flex-1 bg-white hover:bg-zinc-200 text-black font-semibold h-11 rounded-xl">
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
              </CardContent>
            </Card>

            <Card className="bg-[#0c0c0c] border-white/[0.04]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">QR Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center min-h-[320px]">
                  {status.qr ? (
                    <QRDisplay qrData={status.qr} />
                  ) : (
                    <div className="text-center text-zinc-500 space-y-3">
                      <svg className="w-12 h-12 mx-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                      </svg>
                      <p>Click &quot;Connect WhatsApp&quot; to generate QR code</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bot Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Welcome Message */}
            <Card className="bg-[#0c0c0c] border-white/[0.04]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Welcome Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">First Response</Label>
                  <p className="text-xs text-zinc-600 mt-1 mb-3">This is what the bot says when a customer says hi or hello</p>
                  <textarea
                    value={config.welcomeMessage}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                    placeholder="Hi! I'm [Your Name], your property assistant. How can I help you today?"
                    className="w-full h-28 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
                  Preview: {config.welcomeMessage || 'Hi! I\'m [Your Name], your property assistant. How can I help you today?'}
                </div>
              </CardContent>
            </Card>

            {/* Command Toggles */}
            <Card className="bg-[#0c0c0c] border-white/[0.04]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Enabled Commands</CardTitle>
                    <p className="text-xs text-zinc-500 mt-1">Toggle which commands customers can use</p>
                  </div>
                  <span className="text-sm text-zinc-500">{config.enabledCommands.length} active</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ALL_COMMANDS.map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={() => toggleCommand(cmd.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        config.enabledCommands.includes(cmd.id)
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{cmd.name}</p>
                        <div className={`w-8 h-5 rounded-full transition-all ${
                          config.enabledCommands.includes(cmd.id) ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}>
                          <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-all ${
                            config.enabledCommands.includes(cmd.id) ? 'ml-3.5' : 'ml-0.5'
                          }`} />
                        </div>
                      </div>
                      <p className="text-xs opacity-70 mt-1">{cmd.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
