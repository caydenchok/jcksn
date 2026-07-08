import { NextResponse } from 'next/server'
import { getExcludedNumbers, setExcludedNumbers } from '@/lib/whatsapp'

export async function GET() {
  return NextResponse.json({ numbers: getExcludedNumbers() })
}

export async function POST(request: Request) {
  try {
    const { numbers } = await request.json()
    if (!Array.isArray(numbers) || !numbers.every(n => typeof n === 'string')) {
      return NextResponse.json({ error: 'numbers must be a string array' }, { status: 400 })
    }
    await setExcludedNumbers(numbers)
    return NextResponse.json({ numbers: getExcludedNumbers() })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
