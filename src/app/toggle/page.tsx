'use client'

import { useState, useEffect } from 'react'

export default function BotToggle() {
  const [botStatus, setBotStatus] = useState<'on' | 'off' | 'loading'>('loading')
  const [tunnelUrl, setTunnelUrl] = useState('')
  const [lastChecked, setLastChecked] = useState<string>('')
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    checkBotStatus()
    const interval = setInterval(checkBotStatus, 5000)
    return () => clearInterval(interval)
  }, [tunnelUrl])

  async function checkBotStatus() {
    if (!tunnelUrl) return
    try {
      const res = await fetch(`${tunnelUrl}/api/bot-status`)
      const data = await res.json()
      setBotStatus(data.status)
      setLastChecked(new Date().toLocaleTimeString())
    } catch {
      setBotStatus('off')
    }
  }

  async function toggleBot() {
    if (!tunnelUrl) return
    setIsToggling(true)
    try {
      const action = botStatus === 'on' ? 'off' : 'on'
      const res = await fetch(`${tunnelUrl}/api/bot-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const data = await res.json()
      setBotStatus(data.status)
      setLastChecked(new Date().toLocaleTimeString())
    } catch {
      alert('Failed to toggle bot. Is the tunnel running?')
    }
    setIsToggling(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: 'white',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '24px',
        padding: '40px',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
          🤖 JCKSN Bot Control
        </h1>
        <p style={{ color: '#888', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>
          Toggle your WhatsApp AI bot on/off remotely
        </p>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px' }}>
            Cloudflare Tunnel URL
          </label>
          <input
            type="text"
            value={tunnelUrl}
            onChange={(e) => setTunnelUrl(e.target.value)}
            placeholder="https://xxxx.trycloudflare.com"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderRadius: '12px',
          background: botStatus === 'on' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${botStatus === 'on' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          marginBottom: '24px'
        }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '500' }}>Bot Status</p>
            <p style={{ fontSize: '12px', color: '#888' }}>Last checked: {lastChecked || 'Never'}</p>
          </div>
          <div style={{
            width: '48px',
            height: '26px',
            borderRadius: '13px',
            background: botStatus === 'on' ? '#22c55e' : '#666',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.3s'
          }} onClick={toggleBot}>
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '2px',
              left: botStatus === 'on' ? '24px' : '2px',
              transition: 'left 0.3s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>

        <button
          onClick={toggleBot}
          disabled={isToggling || !tunnelUrl}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: isToggling ? '#666' : botStatus === 'on' ? '#ef4444' : '#22c55e',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isToggling ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            marginBottom: '16px'
          }}
        >
          {isToggling ? 'Toggling...' : botStatus === 'on' ? '⏸ Turn Bot OFF' : '▶ Turn Bot ON'}
        </button>

        <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
          {botStatus === 'on' 
            ? '✅ Bot is running — customers can chat with AI' 
            : '⏸ Bot is paused — you reply manually'}
        </p>
      </div>
    </div>
  )
}
