import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context.ts'
import { LoadingState } from './LoadingState.tsx'
import { PageShell } from './PageShell.tsx'

type ProtectedRouteProps = {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading, configError } = useAuth()

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Checking your session..." />
      </PageShell>
    )
  }

  if (configError) {
    return (
      <PageShell>
        <p
          className="px-6 py-16 text-center text-lg text-slate-700"
          role="alert"
        >
          {configError}
        </p>
      </PageShell>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return children
}
