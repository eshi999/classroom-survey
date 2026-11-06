import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState.tsx'
import { PageShell } from '../components/PageShell.tsx'
import { studentMessage } from '../lib/errors.ts'
import {
  getActiveSurveyBySlug,
  getPublicSurveyStatus,
  submitSurveyResponse,
} from '../lib/surveyApi.ts'
import {
  getAnonymousToken,
  hasSubmittedSurvey,
  rememberSubmittedSurvey,
} from '../lib/token.ts'
import type { SurveyDetails } from '../lib/types.ts'
import { primaryButtonClass } from '../lib/ui.ts'

type PageState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'closed'; title: string }
  | { kind: 'ready'; survey: SurveyDetails }
  | { kind: 'submitted' }
  | { kind: 'duplicate' }

export function StudentSurveyPage() {
  const { slug = '' } = useParams()
  const [page, setPage] = useState<PageState>({ kind: 'loading' })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    void getPublicSurveyStatus(slug)
      .then(async (status) => {
        if (!active) return
        if (
          !status.found ||
          status.status === 'closed' ||
          status.status === 'archived'
        ) {
          setPage(
            status.found
              ? { kind: 'closed', title: status.title }
              : { kind: 'missing' },
          )
          return
        }
        const survey = await getActiveSurveyBySlug(slug)
        if (!active) return
        if (!survey) {
          setPage({ kind: 'closed', title: status.title })
          return
        }
        if (hasSubmittedSurvey(survey.id)) {
          setPage({ kind: 'duplicate' })
          return
        }
        setPage({ kind: 'ready', survey })
      })
      .catch((loadError: unknown) => {
        if (active)
          setPage({ kind: 'error', message: studentMessage(loadError) })
      })
    return () => {
      active = false
    }
  }, [slug])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (page.kind !== 'ready') return
    const missing = page.survey.questions.some(
      (question) => !answers[question.id],
    )
    if (missing) {
      setError('Answer every question before submitting.')
      return
    }
    setPending(true)
    setError(null)
    try {
      await submitSurveyResponse(
        page.survey.id,
        getAnonymousToken(),
        page.survey.questions.map((question) => ({
          questionId: question.id,
          choiceId: answers[question.id] ?? '',
        })),
      )
      rememberSubmittedSurvey(page.survey.id)
      setPage({ kind: 'submitted' })
    } catch (submitError) {
      const message = studentMessage(submitError)
      if (message.includes('already submitted')) {
        rememberSubmittedSurvey(page.survey.id)
        setPage({ kind: 'duplicate' })
        return
      }
      if (message.includes('no longer accepting')) {
        setPage({ kind: 'closed', title: page.survey.title })
        return
      }
      setError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <PageShell>
      <main className="mx-auto min-h-svh w-full max-w-xl px-4 py-8">
        {page.kind === 'loading' ? (
          <LoadingState label="Loading survey..." />
        ) : null}
        {page.kind === 'missing' ? (
          <h1 className="text-2xl font-semibold">Survey not found.</h1>
        ) : null}
        {page.kind === 'error' ? (
          <p className="text-lg text-red-700" role="alert">
            {page.message}
          </p>
        ) : null}
        {page.kind === 'closed' ? (
          <>
            <h1 className="text-2xl font-semibold">{page.title}</h1>
            <p className="mt-4 text-lg text-slate-700">
              This survey is no longer accepting responses.
            </p>
          </>
        ) : null}
        {page.kind === 'submitted' ? (
          <>
            <h1 className="text-3xl font-semibold">Thank you!</h1>
            <p className="mt-4 text-lg text-slate-700">
              Your response has been recorded.
            </p>
          </>
        ) : null}
        {page.kind === 'duplicate' ? (
          <h1 className="text-2xl font-semibold">
            You have already submitted a response to this survey.
          </h1>
        ) : null}
        {page.kind === 'ready' ? (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <h1 className="text-3xl font-semibold">{page.survey.title}</h1>
            {page.survey.description ? (
              <p className="mt-3 text-lg text-slate-700">
                {page.survey.description}
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <ol className="mt-8 space-y-8">
              {page.survey.questions.map((question, index) => (
                <li key={question.id}>
                  <fieldset>
                    <legend className="text-lg font-medium">
                      {index + 1}. {question.questionText}
                    </legend>
                    <div className="mt-3 space-y-3">
                      {question.choices.map((choice) => (
                        <label
                          key={choice.id}
                          className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-base"
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={choice.id}
                            className="size-5"
                            checked={answers[question.id] === choice.id}
                            onChange={() =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: choice.id,
                              }))
                            }
                          />
                          {choice.choiceText}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
            <button
              type="submit"
              className={`${primaryButtonClass} mt-8 w-full`}
              disabled={pending}
            >
              {pending ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        ) : null}
      </main>
    </PageShell>
  )
}
