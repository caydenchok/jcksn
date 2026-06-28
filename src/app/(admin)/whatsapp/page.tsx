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
        width: 250,
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

  return <canvas ref={canvasRef} className="mx-auto rounded-lg" />
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus>({
    status: 'disconnected',
    qr: null,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [])

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Connection</h1>
        <p className="text-zinc-500 mt-1">Connect your WhatsApp to start receiving messages</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#0a0a0a] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                status.status === 'connected' ? 'bg-white animate-pulse-cyan' :
                status.status === 'connecting' ? 'bg-zinc-400 animate-pulse-cyan' :
                'bg-zinc-600'
              }`} />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg font-medium text-sm ${
                status.status === 'connected' ? 'bg-white text-black' :
                status.status === 'connecting' ? 'bg-white/10 text-white' :
                'bg-white/5 text-zinc-500'
              }`}>
                {status.status === 'connected' ? 'Connected' :
                 status.status === 'connecting' ? 'Connecting...' :
                 'Disconnected'}
              </div>
            </div>

            <Button
              onClick={connectWhatsApp}
              disabled={loading || status.status === 'connected'}
              className="w-full bg-white hover:bg-zinc-200 text-black font-medium"
            >
              {loading ? 'Connecting...' :
               status.status === 'connected' ? 'Connected' :
               'Connect WhatsApp'}
            </Button>

            <div className="p-4 rounded-lg bg-white/5 text-sm text-zinc-400">
              <p className="font-medium text-white mb-2">How to connect:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click &quot;Connect WhatsApp&quot; button above</li>
                <li>Open WhatsApp on your phone</li>
                <li>Go to Settings → Linked Devices</li>
                <li>Scan the QR code shown here</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg">QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[300px]">
            {status.status === 'connected' ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-medium">WhatsApp Connected!</p>
                <p className="text-sm text-zinc-500 mt-1">Your AI assistant is ready</p>
              </div>
            ) : status.qr ? (
              <div className="text-center">
                <QRDisplay qrData={status.qr} />
                <p className="text-sm text-zinc-500 mt-4">Scan this QR code with WhatsApp</p>
              </div>
            ) : (
              <div className="text-center text-zinc-500">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p>Click &quot;Connect WhatsApp&quot; to generate QR code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
