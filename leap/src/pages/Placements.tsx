import { useState } from 'react'
import {
  Badge, Card, Empty, ErrorBox, Loading, PageHeader, SearchInput,
  Stat, Table, Td, Tr, inputCls,
} from '../components/ui'
import { useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { allocateSupervisor, listApplications, listSupervisors } from '../services/api'
import { useAction } from '../hooks'
import { fmt, elapsedPct } from '../lib/dates'
import { Briefcase, Building2, GraduationCap, CalendarCheck, UserCog } from 'lucide-react'

type Row = import('../types').Application & { studentName: string; hostName?: string; supervisorName?: string }

export default function Placements() {
  const { user } = useAuth()
  const q = useApi('applications', listApplications)
  const sup = useApi('supervisors', listSupervisors)
  const alloc = useAction(({ id, s }: { id: string; s: string }) => allocateSupervisor(id, s), 'Supervisor allocated')
  const [term, setTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const all = q.data as Row[]
  // Only show confirmed and completed placements (not pending applications)
  const placements = all.filter((a) => ['Confirmed', 'Completed'].includes(a.status))
  const statuses = [...new Set(placements.map((p) => p.status))]
  const filtered = placements.filter((p) => {
    const matchTerm = `${p.studentName} ${p.hostName ?? ''} ${p.supervisorName ?? ''}`.toLowerCase().includes(term.toLowerCase())
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchTerm && matchStatus
  })

  const isCoordinator = user!.role === 'coordinator'

  return (
    <div className="space-y-5">
      <PageHeader
        title="Placements"
        description={isCoordinator ? "Manage confirmed internship placements and supervisor assignments." : "View confirmed internship placements."}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active Placements" value={placements.filter((p) => p.status === 'Confirmed').length} icon={<Briefcase size={18} />} />
        <Stat label="Completed" value={placements.filter((p) => p.status === 'Completed').length} icon={<GraduationCap size={18} />} />
        <Stat label="With Supervisor" value={placements.filter((p) => p.supervisorId).length} icon={<UserCog size={18} />} />
        <Stat label="Without Supervisor" value={placements.filter((p) => !p.supervisorId).length} icon={<CalendarCheck size={18} />} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <SearchInput value={term} onChange={setTerm} placeholder="Search student, host or supervisor…" className="w-full sm:w-64" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} w-full sm:w-40`} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <Empty title="No placements found" hint="Confirmed placements appear here once applications are matched and accepted." />
        ) : (
          <Table head={['Student', 'Host Organisation', 'Start', 'End', 'Progress', 'Supervisor', 'Status']}>
            {filtered.map((p) => (
              <Tr key={p.id}>
                <Td><span className="font-medium">{p.studentName}</span></Td>
                <Td>{p.hostName ?? <span className="text-muted">—</span>}</Td>
                <Td><span className="text-xs">{fmt(p.start)}</span></Td>
                <Td><span className="text-xs">{fmt(p.end)}</span></Td>
                <Td>
                  {p.start && p.end && p.status === 'Confirmed' ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-line">
                        <div className="h-2 rounded-full bg-teal" style={{ width: `${elapsedPct(p.start, p.end)}%` }} />
                      </div>
                      <span className="text-xs text-muted">{elapsedPct(p.start, p.end)}%</span>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td>
                  {isCoordinator && p.status === 'Confirmed' ? (
                    <select
                      aria-label={`Supervisor for ${p.studentName}`}
                      className={`${inputCls} max-w-[180px]`}
                      value={p.supervisorId ?? ''}
                      onChange={(e) => alloc.mutate({ id: p.id, s: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {sup.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : (
                    p.supervisorName ?? <span className="text-muted">Not assigned</span>
                  )}
                </Td>
                <Td><Badge>{p.status}</Badge></Td>
              </Tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-xs text-muted">{filtered.length} of {placements.length} placements</p>
      </Card>
    </div>
  )
}
