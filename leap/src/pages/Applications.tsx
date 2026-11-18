import { useState } from 'react'
import { z } from 'zod'
import { useZodForm } from '../lib/form'
import {
  Alert, Badge, Button, Card, Confirm, Empty, ErrorBox, Field,
  Loading, Modal, PageHeader, SearchInput, Table, Td, Tr, inputCls, useToast,
} from '../components/ui'
import { useAction, useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import {
  addReviewNote, allocateSupervisor, apply, approveMatch, hostRespond,
  listApplications, listHosts, listSupervisors, placementLetter,
  profileComplete, myStudent, rejectApplication, startReview, withdrawApplication,
} from '../services/api'
import { SECTORS } from '../lib/constants'
import { fmt } from '../lib/dates'
import type { Application } from '../types'
import { FileText } from 'lucide-react'

type Row = Application & { studentName: string; hostName?: string; supervisorName?: string }

export default function Applications() {
  const { user } = useAuth()
  const q = useApi('applications', listApplications)
  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />
  const rows = q.data as Row[]
  if (user!.role === 'student') return <StudentView rows={rows} />
  if (user!.role === 'host') return <HostView rows={rows} />
  return <CoordinatorView rows={rows} />
}

function StudentView({ rows }: { rows: Row[] }) {
  const me = useApi('myStudent', myStudent)
  const submit = useAction(apply, 'Application submitted — status: Pending')
  const withdraw = useAction(withdrawApplication, 'Application withdrawn')
  const [letter, setLetter] = useState('')
  const [confirmWithdraw, setConfirmWithdraw] = useState<string | null>(null)
  const toast = useToast()

  const f = useZodForm(z.object({
    sector: z.string().min(1, 'Choose a sector.'),
    statement: z.string().min(10, 'Write at least 10 characters.'),
  }))

  if (me.isLoading) return <Loading />
  if (me.error) return <ErrorBox error={me.error} />

  const live = rows.find((r) => !['Rejected', 'Declined', 'Withdrawn'].includes(r.status))

  return (
    <div className="space-y-5">
      <PageHeader title="Internship Applications" description="Apply for a placement and track your application status." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Submit an application">
          {me.data && !profileComplete(me.data) && (
            <Alert type="warning">
              Complete your profile first — applications are blocked until your profile is complete.
            </Alert>
          )}
          {live ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted">You have an active application.</p>
              <div className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{live.sector}</span>
                  <Badge>{live.status}</Badge>
                </div>
                {live.hostName && <p className="mt-1 text-muted">{live.hostName}</p>}
                {live.start && live.end && <p className="mt-0.5 text-muted">{fmt(live.start)} – {fmt(live.end)}</p>}
              </div>
              {['Pending', 'Under Review'].includes(live.status) && (
                <Button size="sm" variant="ghost" onClick={() => setConfirmWithdraw(live.id)}>
                  Withdraw application
                </Button>
              )}
            </div>
          ) : (
            <form className="space-y-4" onSubmit={f.handleSubmit((v) => submit.mutate(v, { onSuccess: () => f.reset() }))}>
              <Field label="Preferred sector" required error={f.formState.errors.sector?.message}>
                <select className={inputCls} {...f.register('sector')}>
                  <option value="">Choose…</option>
                  {SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Personal statement" required error={f.formState.errors.statement?.message} hint="Explain why you want this placement and what you hope to learn.">
                <textarea rows={4} className={inputCls} {...f.register('statement')} />
              </Field>
              <Button type="submit" disabled={submit.isPending || !!(me.data && !profileComplete(me.data))}>
                Submit application
              </Button>
            </form>
          )}
        </Card>

        <Card title="Application history">
          {rows.length === 0 ? (
            <Empty title="No applications yet" hint="Submit one to start. It stays Pending until the Coordinator reviews it." />
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.sector}</span>
                    <Badge>{r.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">Applied {fmt(r.createdAt)}</p>
                  {r.hostName && <p className="mt-1 text-muted">{r.hostName}</p>}
                  {r.start && r.end && <p className="mt-0.5 text-muted">{fmt(r.start)} – {fmt(r.end)}</p>}
                  {r.supervisorName && <p className="mt-0.5 text-muted">Supervisor: {r.supervisorName}</p>}
                  {r.reason && <p className="mt-1 text-bad text-xs">Reason: {r.reason}</p>}
                  {['Awaiting Host Response', 'Confirmed', 'Completed'].includes(r.status) && (
                    <button
                      className="mt-2 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                      onClick={() => { try { setLetter(placementLetter(r.id)) } catch (e) { toast((e as Error).message, true) } }}
                    >
                      <FileText size={12} /> View placement letter
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {letter && (
        <Modal title="Placement letter" onClose={() => setLetter('')}>
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-xs leading-relaxed">{letter}</pre>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => window.print()}>Print</Button>
            <Button variant="ghost" onClick={() => setLetter('')}>Close</Button>
          </div>
        </Modal>
      )}

      {confirmWithdraw && (
        <Confirm
          title="Withdraw application?"
          message="Your application will be marked as withdrawn. You can submit a new one afterwards."
          confirmLabel="Withdraw" danger
          onConfirm={() => withdraw.mutate(confirmWithdraw)}
          onClose={() => setConfirmWithdraw(null)}
        />
      )}
    </div>
  )
}

function HostView({ rows }: { rows: Row[] }) {
  const respond = useAction(
    ({ id, accept, reason }: { id: string; accept: boolean; reason?: string }) => hostRespond(id, accept, reason),
    'Response recorded',
  )
  const [declining, setDeclining] = useState<Row | null>(null)
  const [reason, setReason] = useState('')

  return (
    <div className="space-y-5">
      <PageHeader title="Placement Requests" description="Review and respond to placement requests from the LEAP Coordinator." />
      <Card>
        {rows.length === 0 ? (
          <Empty title="No requests" hint="Requests sent by the LEAP Coordinator appear here." />
        ) : (
          <Table head={['Student', 'Period', 'Status', 'Action']}>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td><span className="font-medium">{r.studentName}</span></Td>
                <Td>{fmt(r.start)} – {fmt(r.end)}</Td>
                <Td><Badge>{r.status}</Badge></Td>
                <Td>
                  {r.status === 'Awaiting Host Response' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => respond.mutate({ id: r.id, accept: true })}>Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeclining(r)}>Decline</Button>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {declining && (
        <Modal title={`Decline: ${declining.studentName}`} onClose={() => setDeclining(null)}>
          <Field label="Reason for declining" required hint="This will be shared with the Coordinator.">
            <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeclining(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => respond.mutate({ id: declining.id, accept: false, reason }, { onSuccess: () => { setDeclining(null); setReason('') } })}>
              Decline request
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CoordinatorView({ rows }: { rows: Row[] }) {
  const [match, setMatch] = useState<Row | null>(null)
  const [rej, setRej] = useState<Row | null>(null)
  const [reason, setReason] = useState('')
  const [noteRow, setNoteRow] = useState<Row | null>(null)
  const [noteText, setNoteText] = useState('')
  const [term, setTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const review = useAction(startReview, 'Moved to Under Review')
  const reject = useAction(({ id, reason }: { id: string; reason: string }) => rejectApplication(id, reason), 'Application rejected')
  const addNote = useAction(({ id, notes }: { id: string; notes: string }) => addReviewNote(id, notes), 'Note saved')
  const sup = useApi('supervisors', listSupervisors)
  const alloc = useAction(({ id, s }: { id: string; s: string }) => allocateSupervisor(id, s), 'Supervisor allocated')

  const statuses = [...new Set(rows.map((r) => r.status))]
  const filtered = rows.filter((r) => {
    const matchTerm = `${r.studentName} ${r.sector} ${r.hostName ?? ''}`.toLowerCase().includes(term.toLowerCase())
    const matchStatus = !statusFilter || r.status === statusFilter
    return matchTerm && matchStatus
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Placement Applications" description="Review student applications and manage host organisation matching." />

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <SearchInput value={term} onChange={setTerm} placeholder="Search student, sector, host…" className="w-full sm:w-64" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} w-full sm:w-48`} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <Empty title="No applications found" hint={term || statusFilter ? 'Adjust your search or filter.' : 'No applications have been submitted yet.'} />
        ) : (
          <Table head={['Student', 'Sector', 'Date', 'Status', 'Host', 'Supervisor', 'Actions']}>
            {filtered.map((r) => (
              <Tr key={r.id}>
                <Td><span className="font-medium">{r.studentName}</span></Td>
                <Td>{r.sector}</Td>
                <Td><span className="text-xs text-muted">{fmt(r.createdAt)}</span></Td>
                <Td><Badge>{r.status}</Badge></Td>
                <Td>{r.hostName ?? <span className="text-muted">—</span>}</Td>
                <Td>
                  {['Confirmed', 'Awaiting Host Response'].includes(r.status) ? (
                    <select aria-label={`Supervisor for ${r.studentName}`} className={`${inputCls} max-w-[180px]`} value={r.supervisorId ?? ''} onChange={(e) => alloc.mutate({ id: r.id, s: e.target.value })}>
                      <option value="">Unassigned</option>
                      {sup.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : (r.supervisorName ?? <span className="text-muted">—</span>)}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {r.status === 'Pending' && <Button size="sm" variant="ghost" onClick={() => review.mutate(r.id)}>Start review</Button>}
                    {['Pending', 'Under Review', 'Declined'].includes(r.status) && <Button size="sm" onClick={() => setMatch(r)}>{r.status === 'Declined' ? 'Rematch' : 'Match'}</Button>}
                    {['Pending', 'Under Review'].includes(r.status) && <Button size="sm" variant="danger" onClick={() => { setRej(r); setReason('') }}>Reject</Button>}
                    <Button size="sm" variant="ghost" onClick={() => { setNoteRow(r); setNoteText(r.reviewNotes ?? '') }}>Note</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-xs text-muted">{filtered.length} of {rows.length} applications</p>
      </Card>

      {match && <MatchModal row={match} supervisors={sup.data ?? []} onClose={() => setMatch(null)} />}

      {rej && (
        <Modal title={`Reject application: ${rej.studentName}`} onClose={() => setRej(null)}>
          <Field label="Reason for rejection" required hint="The student will be notified with this reason.">
            <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRej(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => reject.mutate({ id: rej.id, reason }, { onSuccess: () => setRej(null) })}>Reject application</Button>
          </div>
        </Modal>
      )}

      {noteRow && (
        <Modal title={`Review note: ${noteRow.studentName}`} onClose={() => setNoteRow(null)}>
          <Field label="Review notes" hint="Internal notes for coordinator use only.">
            <textarea className={inputCls} rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNoteRow(null)}>Cancel</Button>
            <Button onClick={() => addNote.mutate({ id: noteRow.id, notes: noteText }, { onSuccess: () => setNoteRow(null) })}>Save note</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MatchModal({ row, supervisors, onClose }: { row: Row; supervisors: { id: string; name: string }[]; onClose: () => void }) {
  const hosts = useApi('hosts', listHosts)
  const [v, setV] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [sup, setSup] = useState(row.supervisorId ?? '')
  const [ask, setAsk] = useState(false)
  const go = useAction(() => approveMatch(row.id, { vacancyId: v, start, end, supervisorId: sup || undefined }), 'Match approved — request sent to host')

  const options = hosts.data?.flatMap((h) =>
    h.vacancies.filter((x) => x.open && x.filled < x.capacity).map((x) => ({ id: x.id, label: `${h.name} — ${x.title} (${x.capacity - x.filled} left)${h.verified ? '' : ' [unverified]'}` }))
  ) ?? []

  return (
    <Modal title={`Match ${row.studentName}`} onClose={onClose}>
      <div className="mb-4 space-y-1 text-sm">
        <p className="text-muted">Preferred sector: <span className="font-medium text-ink">{row.sector}</span></p>
        {row.declineHistory.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-warn">
            Previous declines: {row.declineHistory.join('; ')}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <Field label="Vacancy" required>
          <select className={inputCls} value={v} onChange={(e) => setV(e.target.value)}>
            <option value="">Choose a vacancy…</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" required><input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="End date" required><input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Academic supervisor">
          <select className={inputCls} value={sup} onChange={(e) => setSup(e.target.value)}>
            <option value="">Allocate later</option>
            {supervisors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!v || !start || !end} onClick={() => setAsk(true)}>Approve match</Button>
      </div>
      {ask && (
        <Confirm
          title="Send placement request?"
          message="This generates the placement letter and sends a request to the host organisation."
          confirmLabel="Approve and send"
          onConfirm={() => go.mutate(undefined, { onSuccess: onClose })}
          onClose={() => setAsk(false)}
        />
      )}
    </Modal>
  )
}
