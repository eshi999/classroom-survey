import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context.ts'
import { instructorMessage } from '../lib/errors.ts'
import { primaryButtonClass, secondaryButtonClass } from '../lib/ui.ts'
import { PageShell } from './PageShell.tsx'

type InstructorFrameProps = {
  children: ReactNode
}

export function InstructorFrame({ children }: InstructorFrameProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      window.alert(instructorMessage(error))
    }
  }

  return (
    <PageShell>
      <header className="border-b border-slate-200">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <Link
              to="/dashboard"
              className="text-lg font-semibold text-slate-900"
            >
              Classroom Survey
            </Link>
            <p className="text-sm text-slate-600">Dashboard</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {user?.email ? (
              <p className="text-sm text-slate-700">{user.email}</p>
            ) : null}
            <Link to="/surveys/new" className={primaryButtonClass}>
              New Survey
            </Link>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void handleSignOut()}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        {children}
      </div>
    </PageShell>
  )
}
