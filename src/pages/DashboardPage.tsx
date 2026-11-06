import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { InstructorFrame } from '../components/InstructorFrame.tsx'
import { LoadingState } from '../components/LoadingState.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { instructorMessage } from '../lib/errors.ts'
import { formatSurveyDate, matchesCreatedDate } from '../lib/dates.ts'
import {
  activateSurvey,
  archiveSurvey,
  closeSurvey,
  deleteSurvey,
  duplicateSurvey,
  listResponseCounts,
  listSurveys,
} from '../lib/surveyApi.ts'
import type { Survey, SurveyStatus } from '../lib/types.ts'
import {
  primaryButtonClass,
  secondaryButtonClass,
  textInputClass,
} from '../lib/ui.ts'

type PendingConfirm =
  | { kind: 'delete'; survey: Survey }
  | { kind: 'archive'; survey: Survey }
  | { kind: 'close'; survey: Survey }
  | null

const statusOptions: Array<SurveyStatus | 'all'> = [
  'all',
  'draft',
  'active',
  'closed',
  'archived',
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<SurveyStatus | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<PendingConfirm>(null)

  async function refresh() {
    setError(null)
    const [nextSurveys, nextCounts] = await Promise.all([
      listSurveys(),
      listResponseCounts(),
    ])
    setSurveys(nextSurveys)
    setCounts(nextCounts)
  }

  useEffect(() => {
    let active = true
    void Promise.all([listSurveys(), listResponseCounts()])
      .then(([nextSurveys, nextCounts]) => {
        if (!active) return
        setSurveys(nextSurveys)
        setCounts(nextCounts)
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
  }, [])

  const visibleSurveys = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return surveys.filter((survey) => {
      if (status !== 'all' && survey.status !== status) return false
      if (needle && !survey.title.toLowerCase().includes(needle)) return false
      return matchesCreatedDate(survey.createdAt, fromDate, toDate)
    })
  }, [fromDate, query, status, surveys, toDate])

  async function runAction(surveyId: string, action: () => Promise<void>) {
    setBusyId(surveyId)
    setError(null)
    try {
      await action()
      await refresh()
    } catch (actionError) {
      setError(instructorMessage(actionError))
    } finally {
      setBusyId(null)
      setConfirming(null)
    }
  }

  async function handleActivate(survey: Survey) {
    setBusyId(survey.id)
    setError(null)
    try {
      const result = await activateSurvey(survey.id)
      navigate(`/surveys/${result.id}/present`)
    } catch (actionError) {
      setError(instructorMessage(actionError))
      setBusyId(null)
    }
  }

  async function handleDuplicate(survey: Survey) {
    setBusyId(survey.id)
    setError(null)
    try {
      const copyId = await duplicateSurvey(survey.id)
      navigate(`/surveys/${copyId}/edit`)
    } catch (actionError) {
      setError(instructorMessage(actionError))
      setBusyId(null)
    }
  }

  const confirmCopy = confirming
    ? {
        title:
          confirming.kind === 'delete'
            ? `Delete "${confirming.survey.title}"?`
            : confirming.kind === 'archive'
              ? `Archive "${confirming.survey.title}"?`
              : `Close "${confirming.survey.title}"?`,
        description:
          confirming.kind === 'delete'
            ? `This will permanently delete the survey and all of its responses.${
                (counts[confirming.survey.id] ?? 0) > 0
                  ? ` This survey has ${counts[confirming.survey.id]} responses.`
                  : ''
              }`
            : confirming.kind === 'archive'
              ? 'Students will no longer be able to submit. Existing responses are kept.'
              : 'Students will no longer be able to submit responses.',
        confirmLabel:
          confirming.kind === 'delete'
            ? 'Delete'
            : confirming.kind === 'archive'
              ? 'Archive'
              : 'Close survey',
        danger: confirming.kind === 'delete',
      }
    : null

  return (
    <InstructorFrame>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Surveys</h1>
          <p className="mt-1 text-slate-600">
            Prepare a survey, then activate it for class.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-slate-800 sm:col-span-2">
          Search
          <input
            className={`${textInputClass} mt-1`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by survey title"
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Status
          <select
            className={`${textInputClass} mt-1`}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as SurveyStatus | 'all')
            }
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all'
                  ? 'All'
                  : option[0]?.toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-800">
            From
            <input
              className={`${textInputClass} mt-1`}
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-800">
            To
            <input
              className={`${textInputClass} mt-1`}
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <LoadingState label="Loading surveys..." /> : null}

      {!loading && surveys.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
          <p className="text-lg text-slate-700">
            You have not created any surveys yet.
          </p>
          <Link to="/surveys/new" className={`${primaryButtonClass} mt-6`}>
            Create Your First Survey
          </Link>
        </div>
      ) : null}

      {!loading && surveys.length > 0 && visibleSurveys.length === 0 ? (
        <p className="mt-10 text-center text-lg text-slate-600">
          No surveys match your search.
        </p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {visibleSurveys.map((survey) => {
          const busy = busyId === survey.id
          return (
            <li
              key={survey.id}
              className="rounded-lg border border-slate-200 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{survey.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Created {formatSurveyDate(survey.createdAt)}
                  </p>
                </div>
                <StatusBadge status={survey.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {survey.status !== 'active' && survey.status !== 'archived' ? (
                  <Link
                    to={`/surveys/${survey.id}/edit`}
                    className={secondaryButtonClass}
                  >
                    Edit
                  </Link>
                ) : null}
                {survey.status === 'active' ? (
                  <Link
                    to={`/surveys/${survey.id}/present`}
                    className={primaryButtonClass}
                  >
                    Present
                  </Link>
                ) : null}
                {survey.status !== 'active' && survey.status !== 'archived' ? (
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={busy}
                    onClick={() => void handleActivate(survey)}
                  >
                    {busy ? 'Working...' : 'Activate'}
                  </button>
                ) : null}
                {survey.status === 'active' ? (
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={busy}
                    onClick={() => setConfirming({ kind: 'close', survey })}
                  >
                    Close
                  </button>
                ) : null}
                <Link
                  to={`/surveys/${survey.id}/results`}
                  className={secondaryButtonClass}
                >
                  Results
                </Link>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={busy}
                  onClick={() => void handleDuplicate(survey)}
                >
                  Duplicate
                </button>
                {survey.status !== 'archived' ? (
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={busy}
                    onClick={() => setConfirming({ kind: 'archive', survey })}
                  >
                    Archive
                  </button>
                ) : null}
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={busy}
                  onClick={() => setConfirming({ kind: 'delete', survey })}
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={confirming !== null}
        title={confirmCopy?.title ?? ''}
        description={confirmCopy?.description ?? ''}
        confirmLabel={confirmCopy?.confirmLabel ?? 'Confirm'}
        danger={confirmCopy?.danger}
        pending={busyId !== null}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return
          if (confirming.kind === 'delete') {
            void runAction(confirming.survey.id, () =>
              deleteSurvey(confirming.survey.id),
            )
          } else if (confirming.kind === 'archive') {
            void runAction(confirming.survey.id, () =>
              archiveSurvey(confirming.survey.id),
            )
          } else {
            void runAction(confirming.survey.id, () =>
              closeSurvey(confirming.survey.id),
            )
          }
        }}
      />
    </InstructorFrame>
  )
}
