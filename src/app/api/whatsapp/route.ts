import { NextResponse } from 'next/server'

function isServerless() {
  return !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.PLATFORM === 'vercel'
}

export async function GET() {
  if (isServerless()) {
    return NextResponse.json({
      status: 'disconnected',
      qr: null,
      message: 'WhatsApp requires a persistent server. Deploy as Electron app or self-hosted server for WhatsApp features.',
      platform: 'serverless'
    })
  }

  const { getConnectionStatus } = await import('@/lib/whatsapp')
  return NextResponse.json(getConnectionStatus())
}

export async function POST(request: Request) {
  if (isServerless()) {
    return NextResponse.json({
      error: 'WhatsApp requires a persistent server. Use the desktop app for WhatsApp features.',
      platform: 'serverless'
    }, { status: 503 })
  }

  const body = await request.json()

  if (body.action === 'start') {
    const { startWhatsApp } = await import('@/lib/whatsapp')
    await startWhatsApp()
    return NextResponse.json({ success: true })
  }

  if (body.action === 'send') {
    const { sendMessage } = await import('@/lib/whatsapp')
    await sendMessage(body.phone, body.message)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
