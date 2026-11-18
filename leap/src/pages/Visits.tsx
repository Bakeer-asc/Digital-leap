import { useState } from 'react'
import {
  Badge, Button, Card, Confirm, Empty, ErrorBox, Field, Loading, Modal,
  PageHeader, SearchInput, Table, Td, Tr, inputCls, Alert,
} from '../components/ui'
import { useAction, useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { cancelVisit, listApplications, listVisits, recordVisitReport, scheduleVisit } from '../services/api'
import { fmt } from '../lib/dates'
import type { Visit } from '../types'
import { CalendarPlus, FileText, XCircle } from 'lucide-react'

type FullVisit = Visit & { studentName: string; supervisorName: string }

export default function Visits() {
  const { user } = useAuth()
  const q = useApi('visits', listVisits)
  const apps = useApi('applications', listApplications)
  const [sid, setSid] = useState('')
  const [date, setDate] = useState('')
  const [visitType, setVisitType] = useState<Visit['visitType']>('On-site')
  const [purpose, setPurpose] = useState('')
  const [rep, setRep] = useState<string | null>(null)
  const [obs, setObs] = useState('')
  const [fb, setFb] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [term, setTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const sched = useAction(
    () => scheduleVisit(sid, date, { visitType, purpose: purpose || undefined }),
    'Visit scheduled — student and host notified',
  )
  const report = useAction(
    () => recordVisitReport(rep!, { observations: obs, hostFeedback: fb }),
    'Visit report saved',
  )
  const cancel = useAction(cancelVisit, 'Visit cancelled')

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const role = user!.role
  const canSchedule = role === 'supervisor' || role === 'coordinator'
  const eligible = apps.data?.filter((a) => a.status === 'Confirmed' && a.supervisorId) ?? []

  const visits = q.data as FullVisit[]
  const statuses = [...new Set(visits.map((v) => v.status))]
  const filtered = visits.filter((v) => {
    const matchTerm = `${v.studentName} ${v.supervisorName}`.toLowerCase().includes(term.toLowerCase())
    const matchStatus = !statusFilter || v.status === statusFilter
    return matchTerm && matchStatus
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Supervisory Visits"
        description="Schedule and record academic supervisor visits to placement organisations."
      />

      {/* Schedule form */}
      {canSchedule && (
        <Card title="Schedule a visit">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Field label="Student">
              <select className={inputCls} value={sid} onChange={(e) => setSid(e.target.value)}>
                <option value="">Choose student…</option>
                {eligible.map((a) => (
                  <option key={a.id} value={a.studentId}>{a.studentName}</option>
                ))}
              </select>
            </Field>
            <Field label="Visit date">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Visit type">
              <select
                className={inputCls}
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as Visit['visitType'])}
              >
                <option value="On-site">On-site</option>
                <option value="Virtual">Virtual</option>
                <option value="Phone">Phone</option>
              </select>
            </Field>
            <div className="flex items-end">
              <Button
                disabled={!sid || !date}
                onClick={() =>
                  sched.mutate(undefined, { onSuccess: () => { setSid(''); setDate(''); setPurpose('') } })
                }
                className="w-full"
              >
                <CalendarPlus size={16} /> Schedule visit
              </Button>
            </div>
          </div>
          {eligible.length === 0 && (
            <Alert type="info">
              Visits can only be scheduled for students with confirmed placements and an assigned supervisor.
            </Alert>
          )}
        </Card>
      )}

      {/* Visits table */}
      <Card title="Visit records" description={`${visits.length} total visits`}>
        <div className="mb-4 flex flex-wrap gap-3">
          <SearchInput
            value={term}
            onChange={setTerm}
            placeholder="Search student or supervisor…"
            className="w-full sm:w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputCls} w-full sm:w-40`}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <Empty
            title="No visits found"
            hint="Scheduled visits and their reports appear here."
          />
        ) : (
          <Table head={['Student', 'Supervisor', 'Date', 'Type', 'Status', 'Report / Actions']}>
            {filtered.map((v) => (
              <Tr key={v.id}>
                <Td><span className="font-medium">{v.studentName}</span></Td>
                <Td>{v.supervisorName}</Td>
                <Td>{fmt(v.date)}</Td>
                <Td>
                  <span className="text-xs text-muted">{v.visitType ?? 'On-site'}</span>
                </Td>
                <Td><Badge>{v.status}</Badge></Td>
                <Td>
                  {v.status === 'Completed' ? (
                    <div className="max-w-xs space-y-1 text-xs text-muted">
                      <p><span className="font-medium text-ink">Observations:</span> {v.observations}</p>
                      {v.hostFeedback && (
                        <p><span className="font-medium text-ink">Host:</span> {v.hostFeedback}</p>
                      )}
                    </div>
                  ) : v.status === 'Cancelled' ? (
                    <span className="text-xs text-muted">Cancelled</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {role === 'supervisor' && (
                        <Button
                          size="sm"
                          onClick={() => { setRep(v.id); setObs(''); setFb('') }}
                        >
                          <FileText size={13} /> Record report
                        </Button>
                      )}
                      {canSchedule && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmCancel(v.id)}
                        >
                          <XCircle size={13} /> Cancel
                        </Button>
                      )}
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Record visit report modal */}
      {rep && (
        <Modal title="Record visit report" onClose={() => setRep(null)}>
          <div className="space-y-4">
            <Field label="Observations on student progress" required hint="Describe the student's performance and engagement during the visit.">
              <textarea rows={4} className={inputCls} value={obs} onChange={(e) => setObs(e.target.value)} />
            </Field>
            <Field label="Host organisation feedback" hint="Optional: record any feedback from the host supervisor.">
              <textarea rows={2} className={inputCls} value={fb} onChange={(e) => setFb(e.target.value)} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRep(null)}>Cancel</Button>
            <Button onClick={() => report.mutate(undefined, { onSuccess: () => setRep(null) })}>
              Save report
            </Button>
          </div>
        </Modal>
      )}

      {/* Cancel confirmation */}
      {confirmCancel && (
        <Confirm
          title="Cancel visit?"
          message="The student and host organisation will be notified that the visit has been cancelled."
          confirmLabel="Cancel visit"
          danger
          onConfirm={() => cancel.mutate(confirmCancel)}
          onClose={() => setConfirmCancel(null)}
        />
      )}
    </div>
  )
}
