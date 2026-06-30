'use client'

import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'

import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'

type LogoutButtonProps = ComponentProps<typeof Button>

export function LogoutButton({ children = 'Logout', ...props }: LogoutButtonProps) {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <Button onClick={logout} {...props}>
      {children}
    </Button>
  )
}
