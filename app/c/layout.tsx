import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/server'

const navItems = [
  { href: '/c', label: 'Home' },
  { href: '/c/subjects', label: 'Classes' },
  { href: '/c/calendar', label: 'Leaves' },
  { href: '/c/settings', label: 'Settings' },
]

export default async function PageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="hidden w-44 border-r border-border p-4 md:flex">
        <nav className="flex w-full flex-col gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl pb-24 md:pb-0">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex h-16 items-center justify-around border-t border-border bg-background/95 px-2 text-xs backdrop-blur md:hidden">
        {navItems.map((item) => (
          <Link
            className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
