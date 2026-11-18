import { Badge, Card, DetailItem, Empty, ErrorBox, Loading, PageHeader, SectionTitle, Stat } from '../components/ui'
import { useApi } from '../hooks'
import { listApplications, listLogbooks, listVisits, myStudent } from '../services/api'
import { elapsedPct, fmt } from '../lib/dates'
import { Link } from 'react-router-dom'
import { Building2, CalendarCheck, BookOpen, UserCog, Clock } from 'lucide-react'
import { useRoleLink } from '../lib/useRoleLink'

export default function MyPlacement() {
  const me = useApi('myStudent', myStudent)
  const apps = useApi('applications', listApplications)
  const logs = useApi('logbooks', listLogbooks)
  const visits = useApi('visits', listVisits)
  const rl = useRoleLink()

  if (me.isLoading || apps.isLoading) return <Loading />
  const err = me.error || apps.error
  if (err) return <ErrorBox error={err} />

  const a = apps.data!.find((x) => ['Confirmed', 'Completed'].includes(x.status))
  const upcomingVisits = visits.data?.filter((v) => v.status === 'Scheduled') ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="My Placement" description="Your internship placement details and progress." />

      {!a ? (
        <Card><Empty title="No placement yet" hint="Apply for a placement from the Internship Applications page." /></Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Status" value={<Badge>{a.status}</Badge>} icon={<Building2 size={18} />} />
            <Stat label="Host Organisation" value={a.hostName ?? '—'} />
            <Stat label="Start Date" value={fmt(a.start)} icon={<CalendarCheck size={18} />} />
            <Stat label="End Date" value={fmt(a.end)} icon={<CalendarCheck size={18} />} />
          </div>

          {/* Progress */}
          {a.status === 'Confirmed' && a.start && a.end && (
            <Card title="Internship progress">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Time elapsed</span>
                  <span className="font-medium">{elapsedPct(a.start, a.end)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={elapsedPct(a.start, a.end)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-3 rounded-full bg-teal transition-all" style={{ width: `${elapsedPct(a.start, a.end)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>{fmt(a.start)}</span>
                  <span>{fmt(a.end)}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Details */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Placement details">
              <div className="space-y-4">
                <SectionTitle>Organisation</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem label="Host Organisation" value={a.hostName} />
                  <DetailItem label="Sector" value={a.sector} />
                  <DetailItem label="Supervisor" value={a.supervisorName ?? 'Not yet assigned'} />
                  <DetailItem label="Placement Period" value={a.start && a.end ? `${fmt(a.start)} – ${fmt(a.end)}` : '—'} />
                </div>
              </div>
            </Card>

            <Card title="Quick actions">
              <div className="space-y-2">
                <Link to={rl('logbook')} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2"><BookOpen size={16} className="text-muted" /> My Logbook</span>
                  <span className="text-xs text-muted">{logs.data?.length ?? 0} entries</span>
                </Link>
                <Link to={rl('reports')} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2"><BookOpen size={16} className="text-muted" /> My Reports</span>
                  <span className="text-xs text-muted">Submit internship report</span>
                </Link>
                <Link to={rl('supervisor')} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2"><UserCog size={16} className="text-muted" /> My Supervisor</span>
                  <span className="text-xs text-muted">{a.supervisorName ?? 'Not assigned'}</span>
                </Link>
                <Link to={rl('visits')} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm hover:bg-slate-50 transition-colors">
                  <span className="flex items-center gap-2"><CalendarCheck size={16} className="text-muted" /> Visits</span>
                  <span className="text-xs text-muted">{upcomingVisits.length} upcoming</span>
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
