import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toDataURL } from 'qrcode'
import { LoadingState } from '../components/LoadingState.tsx'
import { PageShell } from '../components/PageShell.tsx'
import { instructorMessage } from '../lib/errors.ts'
import { closeSurvey, countResponses, getSurvey } from '../lib/surveyApi.ts'
import type { SurveyDetails } from '../lib/types.ts'
import { primaryButtonClass, secondaryButtonClass } from '../lib/ui.ts'

export function PresentPage() {
  const { id = '' } = useParams()
  const [survey, setSurvey] = useState<SurveyDetails | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([getSurvey(id), countResponses(id)])
      .then(([nextSurvey, nextCount]) => {
        if (!active) return
        setSurvey(nextSurvey)
        setCount(nextCount)
        if (!nextSurvey) setError('That survey could not be found.')
      })
      .catch((loadError: unknown) => {
        if (active) setError(instructorMessage(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const publicUrl =
    survey?.publicSlug && typeof window !== 'undefined'
      ? `${window.location.origin}/s/${survey.publicSlug}`
      : ''

  useEffect(() => {
    if (!publicUrl || survey?.status !== 'active') return
    let active = true
    void toDataURL(publicUrl, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then((url) => {
      if (active) setQrUrl(url)
    })
    return () => {
      active = false
    }
  }, [publicUrl, survey?.status])

  async function refreshCount() {
    setCount(await countResponses(id))
  }

  async function handleClose() {
    if (!survey) return
    if (
      !window.confirm(
        `Close "${survey.title}"? Students will no longer be able to submit responses.`,
      )
    ) {
      return
    }
    setPending(true)
    setError(null)
    try {
      await closeSurvey(survey.id)
      const next = await getSurvey(survey.id)
      setSurvey(next)
    } catch (closeError) {
      setError(instructorMessage(closeError))
    } finally {
      setPending(false)
    }
  }

  function downloadQr() {
    if (!qrUrl || !survey?.publicSlug) return
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `${survey.publicSlug}.png`
    link.click()
  }

  return (
    <PageShell>
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center px-6 py-10 text-center">
        {loading ? <LoadingState label="Loading survey..." /> : null}
        {error ? (
          <p className="text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {survey ? (
          <>
            <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              {survey.status}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
              {survey.title}
            </h1>
            {survey.status === 'active' && qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR code for ${publicUrl}`}
                className="mt-8 w-full max-w-md bg-white"
              />
            ) : (
              <p className="mt-8 max-w-lg text-lg text-slate-700">
                Activate this survey from the dashboard to show a QR code.
              </p>
            )}
            {publicUrl && survey.status === 'active' ? (
              <p className="mt-6 max-w-full text-xl break-all text-slate-800 sm:text-2xl">
                {publicUrl}
              </p>
            ) : null}
            <p className="mt-6 text-2xl font-medium">Responses: {count ?? 0}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => void refreshCount()}
              >
                Refresh count
              </button>
              <Link
                to={`/surveys/${survey.id}/results`}
                className={secondaryButtonClass}
              >
                View Results
              </Link>
              {survey.status === 'active' ? (
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={pending || !qrUrl}
                  onClick={downloadQr}
                >
                  Download QR Code
                </button>
              ) : null}
              {survey.status === 'active' ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={pending}
                  onClick={() => void handleClose()}
                >
                  {pending ? 'Closing...' : 'Close Survey'}
                </button>
              ) : null}
              <Link to="/dashboard" className={secondaryButtonClass}>
                Back to Dashboard
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </PageShell>
  )
}
