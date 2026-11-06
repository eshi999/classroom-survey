import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'
import { secondaryButtonClass } from '../lib/ui.ts'

export function NotFoundPage() {
  return (
    <PageShell>
      <main className="flex min-h-svh items-center justify-center px-6 py-16 text-center">
        <section>
          <h1 className="text-3xl font-semibold text-slate-900">
            Page not found
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            That address is not part of this app.
          </p>
          <Link to="/" className={`${secondaryButtonClass} mt-8`}>
            Back to home
          </Link>
        </section>
      </main>
    </PageShell>
  )
}
