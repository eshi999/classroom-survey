import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context.ts'
import { instructorMessage } from '../lib/errors.ts'
import { primaryButtonClass, textInputClass } from '../lib/ui.ts'
import { LoadingState } from '../components/LoadingState.tsx'
import { PageShell } from '../components/PageShell.tsx'

export function LoginPage() {
  const { session, loading, configError, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Checking your session..." />
      </PageShell>
    )
  }
  if (session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setPending(true)
    try {
      await signIn(email.trim(), password)
    } catch (signInError) {
      setError(instructorMessage(signInError))
    } finally {
      setPending(false)
    }
  }

  return (
    <PageShell>
      <main className="flex min-h-svh items-center justify-center px-6 py-16">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="w-full max-w-md"
          noValidate
        >
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Instructor Login
          </h1>
          <p className="mt-2 text-slate-600">
            Sign in to prepare and present surveys.
          </p>
          {configError ? (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {configError}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <label
            className="mt-6 block text-sm font-medium text-slate-800"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            className={`${textInputClass} mt-2`}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label
            className="mt-4 block text-sm font-medium text-slate-800"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            className={`${textInputClass} mt-2`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="submit"
            className={`${primaryButtonClass} mt-6 w-full`}
            disabled={pending || Boolean(configError)}
          >
            {pending ? 'Signing in...' : 'Log In'}
          </button>
          <p className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm font-medium text-slate-700 underline"
            >
              Back to home
            </Link>
          </p>
        </form>
      </main>
    </PageShell>
  )
}
