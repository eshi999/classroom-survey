import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell.tsx'

type PlaceholderPageProps = {
  title: string
  description: string
  phase?: string
}

export function PlaceholderPage({
  title,
  description,
  phase,
}: PlaceholderPageProps) {
  return (
    <PageShell>
      <main className="flex min-h-svh items-center justify-center px-6 py-16">
        <section className="w-full max-w-lg text-center">
          {phase ? (
            <p className="text-sm font-medium tracking-wide text-slate-500 uppercase">
              {phase}
            </p>
          ) : null}
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-4 text-lg text-slate-600">{description}</p>
          <Link
            to="/"
            className="mt-10 inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-5 text-base font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Back to home
          </Link>
        </section>
      </main>
    </PageShell>
  )
}
