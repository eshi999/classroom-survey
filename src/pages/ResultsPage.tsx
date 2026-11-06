import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { InstructorFrame } from '../components/InstructorFrame.tsx'
import { LoadingState } from '../components/LoadingState.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { buildResultsCsv, csvFilename } from '../lib/csv.ts'
import { instructorMessage } from '../lib/errors.ts'
import { getSurveyResults } from '../lib/surveyApi.ts'
import type { SurveyResults } from '../lib/types.ts'
import { secondaryButtonClass } from '../lib/ui.ts'

export function ResultsPage() {
  const { id = '' } = useParams()
  const [results, setResults] = useState<SurveyResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    return getSurveyResults(id)
      .then((next) => {
        setResults(next)
        if (!next) setError('That survey could not be found.')
      })
      .catch((loadError: unknown) => setError(instructorMessage(loadError)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    void getSurveyResults(id)
      .then((next) => {
        if (!active) return
        setResults(next)
        if (!next) setError('That survey could not be found.')
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

  function exportCsv() {
    if (!results) return
    const csv = buildResultsCsv(results, new Date().toISOString())
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = csvFilename(results.survey.title)
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <InstructorFrame>
      {loading ? <LoadingState label="Loading results..." /> : null}
      {error ? (
        <p className="text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {results ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">{results.survey.title}</h1>
              <p className="mt-2 text-lg text-slate-700">
                {results.responseCount} responses
              </p>
            </div>
            <StatusBadge status={results.survey.status} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void load()}
            >
              Refresh
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={exportCsv}
            >
              Export CSV
            </button>
            {results.survey.status === 'active' ? (
              <Link
                to={`/surveys/${results.survey.id}/present`}
                className={secondaryButtonClass}
              >
                Present QR
              </Link>
            ) : null}
            <Link to="/dashboard" className={secondaryButtonClass}>
              Back to Dashboard
            </Link>
          </div>
          {results.responseCount === 0 ? (
            <p className="mt-8 rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-slate-700">
              No responses yet. Display the QR code so students can join.
            </p>
          ) : null}
          <div className="mt-8 space-y-10">
            {results.questions.map((question) => (
              <section key={question.questionId}>
                <h2 className="text-xl font-semibold">
                  {question.questionText}
                </h2>
                {question.unansweredCount > 0 ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {question.unansweredCount} of {results.responseCount}{' '}
                    responses left this question unanswered.
                  </p>
                ) : null}
                <ul className="mt-4 space-y-3">
                  {question.choices.map((choice) => (
                    <li key={choice.choiceId}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium">{choice.choiceText}</span>
                        <span>
                          {choice.count} · {choice.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div
                        className="mt-1 h-3 rounded bg-slate-100"
                        aria-hidden="true"
                      >
                        <div
                          className="h-3 rounded bg-slate-800"
                          style={{
                            width: `${Math.min(choice.percentage, 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={question.choices.map((choice) => ({
                        name: choice.choiceText,
                        count: choice.count,
                      }))}
                      layout="vertical"
                      margin={{ left: 16, right: 16 }}
                    >
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f172a" name="Responses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </InstructorFrame>
  )
}
