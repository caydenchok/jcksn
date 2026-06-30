'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import QRCode from 'qrcode'

interface WhatsAppStatus {
  status: 'disconnected' | 'connecting' | 'connected'
  qr: string | null
}

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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStatus()
    // Only poll if not connected
    const interval = setInterval(() => {
      if (status.status !== 'connected') {
        fetchStatus()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [status.status])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/whatsapp')
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    }
  }

  async function connectWhatsApp() {
    setLoading(true)
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
    } catch (error) {
      console.error('Failed to connect:', error)
    }
    setLoading(false)
  }

  async function disconnectWhatsApp() {
    setLoading(true)
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
    setLoading(false)
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
                  status.status === 'connected' ? 'bg-emerald-500 animate-pulse' :
                  status.status === 'connecting' ? 'bg-amber-500 animate-pulse' :
                  'bg-zinc-600'
                }`} />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`px-5 py-2.5 rounded-xl font-medium text-sm ${
                  status.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                  status.status === 'connecting' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                  'bg-white/5 text-zinc-500 border border-white/5'
                }`}>
                  {status.status === 'connected' ? 'Connected' :
                   status.status === 'connecting' ? 'Connecting...' :
                   'Disconnected'}
                </div>
              </div>

              <div className="flex gap-3">
                {status.status === 'disconnected' ? (
                  <Button
                    onClick={connectWhatsApp}
                    disabled={loading}
                    className="flex-1 bg-white hover:bg-zinc-200 text-black font-semibold h-11 rounded-xl"
                  >
                    {loading ? 'Connecting...' : 'Connect WhatsApp'}
                  </Button>
                ) : (
                  <Button
                    onClick={disconnectWhatsApp}
                    disabled={loading}
                    variant="ghost"
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold h-11 rounded-xl border border-red-500/20"
                  >
                    {loading ? 'Disconnecting...' : 'Disconnect'}
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
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/property</code> - View all properties</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/help</code> - Show commands</p>
                  <p><code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded">/contact</code> - Agent contact info</p>
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
              ) : status.qr ? (
                <div className="text-center">
                  <QRDisplay qrData={status.qr} />
                  <p className="text-sm text-zinc-500 mt-4">Scan this QR code with WhatsApp</p>
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
      </div>
    </div>
  )
}
