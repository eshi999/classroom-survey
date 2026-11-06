import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'

export function HomePage() {
  return (
    <PageShell>
      <main className="flex min-h-svh items-center justify-center px-6 py-16">
        <section className="w-full max-w-md text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Classroom Survey
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Quick in-class understanding checks
          </p>
          <Link
            to="/login"
            className="mt-10 inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-md bg-slate-900 px-6 text-base font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Instructor Login
          </Link>
        </section>
      </main>
    </PageShell>
  )
}
