import { createClient } from '@/lib/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/c'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectUrl = new URL(next, request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
