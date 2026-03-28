import { NextRequest, NextResponse } from 'next/server'
import { predictForAllOpenIPOs } from '@/lib/predict'

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { success, failed } = await predictForAllOpenIPOs()
    return NextResponse.json({ success, failed })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
