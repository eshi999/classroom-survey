import type { ReactNode } from 'react'

type PageShellProps = {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-svh bg-white text-slate-900 antialiased">
      {children}
    </div>
  )
}
