import { useState } from 'react'
import { z } from 'zod'
import { useZodForm } from '../lib/form'
import {
  Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal,
  PageHeader, SearchInput, Table, Td, Tr, inputCls, Alert,
} from '../components/ui'
import { useAction, useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { listApplications, listLogbooks, resubmitLogbook, reviewLogbook, submitLogbook } from '../services/api'
import { fmt } from '../lib/dates'
import { CheckCircle, AlertTriangle, Edit3 } from 'lucide-react'

const schema = z.object({
  date: z.string().min(1, 'Choose a date.'),
  activities: z.string().min(10, 'Describe your activities (at least 10 characters).'),
  skills: z.string().min(1, 'List the skills you used or learned.'),
  hours: z.coerce.number().min(1, 'Enter at least 1 hour.').max(60, 'Maximum 60 hours per week.'),
})

export default function Logbooks() {
  const { user } = useAuth()
  const q = useApi('logbooks', listLogbooks)
  const apps = useApi('applications', listApplications)
  const [editing, setEditing] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [term, setTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const submit = useAction(
    (v: z.infer<typeof schema>) => (editing ? resubmitLogbook(editing, v) : submitLogbook(v)),
    'Logbook submitted — your supervisor will review it',
  )
  const review = useAction(
    ({ id, d }: { id: string; d: 'Approved' | 'Revision Requested' }) => reviewLogbook(id, d, comment),
    'Review sent to the student',
  )
  const f = useZodForm(schema)

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const confirmed = apps.data?.some((a) => a.status === 'Confirmed')
  const rows = q.data!
  const isStudent = user!.role === 'student'
  const isSupervisor = user!.role === 'supervisor'
  const e = f.formState.errors

  const statuses = [...new Set(rows.map((l) => l.status))]
  const filtered = rows.filter((l) => {
    const matchTerm = `${l.studentName} ${l.activities} ${l.skills}`.toLowerCase().includes(term.toLowerCase())
    const matchStatus = !statusFilter || l.status === statusFilter
    return matchTerm && matchStatus
  })

  const pendingRevision = rows.filter((l) => l.status === 'Revision Requested')

  return (
    <div className="space-y-5">
      <PageHeader
        title={isSupervisor ? 'Logbook Reviews' : 'Logbook'}
        description={
          isSupervisor
            ? "Review submitted logbooks from your assigned students."
            : "Submit and track your weekly internship logbook entries."
        }
      />

      {/* Student: revision alerts */}
      {isStudent && pendingRevision.length > 0 && (
        <Alert type="warning">
          {pendingRevision.length} logbook{pendingRevision.length > 1 ? 's' : ''} need revision. Review your supervisor's feedback below and resubmit.
        </Alert>
      )}

      {/* Student: submit form */}
      {isStudent && (
        <Card title={editing ? 'Revise logbook entry' : 'Submit weekly logbook entry'}>
          {!confirmed ? (
            <p className="text-sm text-muted">Logbook submissions open once your placement is confirmed.</p>
          ) : (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={f.handleSubmit((v) => {
                submit.mutate(v, {
                  onSuccess: () => { f.reset(); setEditing(null) },
                })
              })}
            >
              <Field label="Date" error={e.date?.message}>
                <input type="date" className={inputCls} {...f.register('date')} />
              </Field>
              <Field label="Hours worked" error={e.hours?.message}>
                <input type="number" min={1} max={60} className={inputCls} {...f.register('hours')} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Activities performed" error={e.activities?.message} hint="Describe what you did during the week (minimum 10 characters).">
                  <textarea rows={3} className={inputCls} {...f.register('activities')} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Skills acquired" error={e.skills?.message}>
                  <input className={inputCls} {...f.register('skills')} />
                </Field>
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={submit.isPending}>
                  {editing ? 'Resubmit logbook' : 'Submit logbook'}
                </Button>
                {editing && (
                  <Button type="button" variant="ghost" onClick={() => { setEditing(null); f.reset() }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Logbook list */}
      <Card title="Logbook history" description={`${rows.length} total entries`}>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          {!isStudent && (
            <SearchInput
              value={term}
              onChange={setTerm}
              placeholder="Search student or activities…"
              className="w-full sm:w-64"
            />
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputCls} w-full sm:w-44`}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <Empty
            title="No logbooks found"
            hint={
              isStudent
                ? 'Submit your first weekly entry above.'
                : 'Submitted logbooks from assigned students appear here.'
            }
          />
        ) : (
          <Table
            head={[
              ...(isStudent ? [] : ['Student']),
              'Week', 'Date', 'Hours', 'Activities', 'Skills', 'Status', 'Actions',
            ]}
          >
            {filtered.map((l) => (
              <Tr key={l.id}>
                {!isStudent && <Td><span className="font-medium">{l.studentName}</span></Td>}
                <Td>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold">
                    Week {l.week}
                  </span>
                </Td>
                <Td>{fmt(l.date)}</Td>
                <Td>{l.hours}h</Td>
                <Td>
                  <p className="max-w-xs truncate">{l.activities}</p>
                </Td>
                <Td>
                  <p className="max-w-[120px] truncate text-muted">{l.skills}</p>
                </Td>
                <Td>
                  <div className="space-y-1">
                    <Badge>{l.status}</Badge>
                    {l.comment && (
                      <p className="text-xs text-warn">"{l.comment}"</p>
                    )}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {isStudent && l.status === 'Revision Requested' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(l.id)
                          f.reset({
                            date: l.date,
                            activities: l.activities,
                            skills: l.skills,
                            hours: l.hours,
                          })
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        <Edit3 size={13} /> Revise
                      </Button>
                    )}
                    {isSupervisor && l.status === 'Submitted' && (
                      <Button
                        size="sm"
                        onClick={() => { setReviewing(l.id); setComment('') }}
                      >
                        Review
                      </Button>
                    )}
                    {l.status === 'Approved' && (
                      <span className="flex items-center gap-1 text-xs text-ok">
                        <CheckCircle size={12} /> Approved
                      </span>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Review modal */}
      {reviewing && (
        <Modal title="Review logbook entry" onClose={() => setReviewing(null)}>
          <Field
            label="Supervisor comment"
            hint="A comment is required when requesting a revision."
          >
            <textarea
              rows={3}
              className={inputCls}
              value={comment}
              onChange={(e2) => setComment(e2.target.value)}
            />
          </Field>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() =>
                review.mutate(
                  { id: reviewing, d: 'Revision Requested' },
                  { onSuccess: () => setReviewing(null) },
                )
              }
            >
              <AlertTriangle size={14} /> Request revision
            </Button>
            <Button
              onClick={() =>
                review.mutate(
                  { id: reviewing, d: 'Approved' },
                  { onSuccess: () => setReviewing(null) },
                )
              }
            >
              <CheckCircle size={14} /> Approve logbook
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
