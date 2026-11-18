import { Link } from 'react-router-dom'
import {
  GraduationCap, Building2, Briefcase, BookOpen, CalendarCheck,
  ClipboardCheck, FileBarChart, Clock, CheckCircle, AlertCircle,
  TrendingUp, Users,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Badge, Card, Empty, ErrorBox, Loading, PageHeader, Stat } from '../components/ui'
import { useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import {
  listApplications, listAssessments, listLogbooks,
  listNotifications, listStudents, listVisits,
  myStudent, profileComplete, stats,
} from '../services/api'
import { elapsedPct, fmt, today } from '../lib/dates'
import { useRoleLink } from '../lib/useRoleLink'

const Bar2 = ({ pct }: { pct: number }) => (
  <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-2 rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
  </div>
)

export default function Dashboard() {
  const { user } = useAuth()
  const greeting = `Welcome, ${user!.name.split(' ')[0]}`
  return (
    <div className="space-y-5">
      <PageHeader title={greeting} description="Here is your LEAP internship overview for today." />
      {{ student: <StudentDash />, coordinator: <CoordDash />, supervisor: <SupervisorDash />, host: <HostDash />, management: <MgmtDash /> }[user!.role]}
    </div>
  )
}

function StudentDash() {
  const me = useApi('myStudent', myStudent)
  const apps = useApi('applications', listApplications)
  const logs = useApi('logbooks', listLogbooks)
  const res = useApi('assessments', listAssessments)
  const notes = useApi('notifications', listNotifications)
  const rl = useRoleLink()
  if (me.isLoading || apps.isLoading || logs.isLoading) return <Loading />
  const err = me.error || apps.error || logs.error
  if (err) return <ErrorBox error={err} />
  const s = me.data!
  const a = apps.data!.find((x) => !['Rejected', 'Declined', 'Withdrawn'].includes(x.status)) ?? apps.data![0]
  const pct = profileComplete(s) ? 100 : 50
  const approved = logs.data!.filter((l) => l.status === 'Approved').length
  const pending = logs.data!.filter((l) => l.status === 'Submitted').length
  const revision = logs.data!.filter((l) => l.status === 'Revision Requested').length
  const published = res.data?.find((r) => r.status === 'Published')

  const actions: string[] = [
    !profileComplete(s) ? 'Complete your profile before applying' : '',
    !a && profileComplete(s) ? 'Apply for a placement' : '',
    a?.status === 'Confirmed' && logs.data!.length === 0 ? 'Submit your first weekly logbook' : '',
    revision > 0 ? `${revision} logbook(s) need revision` : '',
  ].filter(Boolean)

  // Days tracking
  const daysCompleted = a?.start && a?.end ? Math.max(0, Math.floor((Date.parse(today()) - Date.parse(a.start)) / 86400000)) : 0
  const daysRemaining = a?.start && a?.end ? Math.max(0, Math.floor((Date.parse(a.end) - Date.parse(today())) / 86400000)) : 0
  const totalDays = a?.start && a?.end ? Math.floor((Date.parse(a.end) - Date.parse(a.start)) / 86400000) : 0

  // Progress tracker steps
  const steps = [
    { label: 'Profile', done: profileComplete(s) },
    { label: 'Application', done: !!a },
    { label: 'Placement Confirmed', done: !!a && ['Confirmed', 'Completed'].includes(a.status) },
    { label: 'Logbooks', done: logs.data!.length > 0 },
    { label: 'Reports', done: false },
    { label: 'Result', done: !!published },
  ]

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Profile" value={`${pct}%`} hint="Complete" icon={<Users size={18} />} />
        <Stat label="Logbooks" value={approved} hint="Approved" icon={<BookOpen size={18} />} />
        <Stat label="Days Completed" value={daysCompleted} hint={`of ${totalDays} total`} icon={<Clock size={18} />} />
        <Stat label="Days Remaining" value={daysRemaining} icon={<CalendarCheck size={18} />} />
      </div>

      {/* Progress tracker */}
      <Card title="Internship journey" description="Track your progress from application to completion">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${step.done ? 'bg-green-50 text-ok border border-green-200' : 'bg-slate-50 text-muted border border-line'}`}>
                <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${step.done ? 'bg-ok text-white' : 'bg-line text-muted'}`}>
                  {step.done ? '✓' : i + 1}
                </span>
                {step.label}
              </div>
              {i < steps.length - 1 && <span className="text-line">→</span>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">

      <Card title="Profile completion">
        <Bar2 pct={pct} />
        <p className="mt-2 text-sm text-muted">
          {pct}% complete —{' '}
          <Link className="font-medium text-brand hover:underline" to={rl('profile')}>
            open profile
          </Link>
        </p>
      </Card>

      <Card title="Internship placement">
        {a ? (
          <div className="text-sm space-y-2">
            <Badge>{a.status}</Badge>
            {a.hostName && (
              <p className="text-muted">{a.hostName}</p>
            )}
            {a.start && a.end && (
              <p className="text-muted">{fmt(a.start)} – {fmt(a.end)}</p>
            )}
            {a.status === 'Confirmed' && (
              <div className="mt-3">
                <p className="mb-1 text-xs text-muted">Internship progress</p>
                <Bar2 pct={elapsedPct(a.start, a.end)} />
                <p className="mt-1 text-xs text-muted">{elapsedPct(a.start, a.end)}% elapsed</p>
              </div>
            )}
            {a.reason && <p className="text-bad text-xs">Reason: {a.reason}</p>}
          </div>
        ) : (
          <Empty title="No placement yet" hint="Submit an application to begin." />
        )}
      </Card>

      <Card title="Logbook summary">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">Approved</span><span className="font-medium text-ok">{approved}</span></div>
          <div className="flex justify-between"><span className="text-muted">Awaiting review</span><span className="font-medium text-brand">{pending}</span></div>
          <div className="flex justify-between"><span className="text-muted">Need revision</span><span className="font-medium text-warn">{revision}</span></div>
          <div className="flex justify-between"><span className="text-muted">Total submitted</span><span className="font-medium">{logs.data!.length}</span></div>
        </div>
      </Card>

      <Card title="Pending actions">
        {actions.length ? (
          <ul className="space-y-2">
            {actions.map((x) => (
              <li key={x} className="flex items-start gap-2 text-sm">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-warn" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2 text-sm text-ok">
            <CheckCircle size={16} />
            <span>You are up to date.</span>
          </div>
        )}
      </Card>

      <Card title="Internship result">
        {published ? (
          <div className="space-y-1 text-sm">
            <p className="text-2xl font-bold text-ink">{published.overall}%</p>
            <p className="text-muted">Grade <span className="font-semibold text-ok">{published.grade}</span></p>
          </div>
        ) : (
          <p className="text-sm text-muted">Results appear after University Management approves and publishes them.</p>
        )}
      </Card>

      <Card title="Recent notifications">
        {notes.data?.slice(0, 4).length ? (
          <ul className="space-y-2">
            {notes.data.slice(0, 4).map((n) => (
              <li key={n.id} className={`text-sm ${n.read ? 'text-muted' : 'text-ink font-medium'}`}>
                {n.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing new.</p>
        )}
      </Card>
    </div>
    </div>
  )
}

// Helper: a quick-link button that uses the coordinator's role prefix
function CoordLink({ to, label, icon: Icon }: { to: string; label: string; icon: React.ElementType }) {
  const rl = useRoleLink()
  return (
    <Link
      to={rl(to)}
      className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm hover:bg-slate-50 transition-colors"
    >
      <Icon size={16} className="text-muted" />
      {label}
    </Link>
  )
}

function CoordDash() {
  const q = useApi('stats', stats)
  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />
  const s = q.data!

  const placementData = [
    { n: 'Pending', v: s.pending, fill: '#D97706' },
    { n: 'Awaiting Host', v: s.awaitingHost, fill: '#2563EB' },
    { n: 'Confirmed', v: s.confirmed, fill: '#16A34A' },
    { n: 'Declined', v: s.declined, fill: '#DC2626' },
    { n: 'Completed', v: s.completed, fill: '#087F83' },
  ]
  const logData = [
    { n: 'Submitted', v: s.logSubmitted },
    { n: 'Approved', v: s.logApproved },
    { n: 'Revision', v: s.logRevision },
  ]
  const logColors = ['#2563EB', '#16A34A', '#D97706']

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Students" value={s.students} icon={<GraduationCap size={18} />} />
        <Stat label="Active Internships" value={s.confirmed} icon={<Briefcase size={18} />} />
        <Stat label="Pending Applications" value={s.pending} icon={<Clock size={18} />} />
        <Stat label="Open Vacancy Slots" value={s.vacancies} icon={<Building2 size={18} />} />
        <Stat label="Awaiting Host" value={s.awaitingHost} icon={<AlertCircle size={18} />} />
        <Stat label="Logbooks to Review" value={s.logSubmitted} icon={<BookOpen size={18} />} />
        <Stat label="Upcoming Visits" value={s.visitsScheduled} icon={<CalendarCheck size={18} />} />
        <Stat label="Awaiting Approval" value={s.awaitingApproval} icon={<ClipboardCheck size={18} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Placements by status" description="Current application pipeline">
          <div className="h-56" role="img" aria-label="Bar chart of placements by status">
            <ResponsiveContainer>
              <BarChart data={placementData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="n" fontSize={11} tick={{ fill: '#64748B' }} />
                <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                  {placementData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Logbook status" description="Review progress">
          <div className="h-56" role="img" aria-label="Pie chart of logbook status">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={logData} dataKey="v" nameKey="n" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {logData.map((_, i) => <Cell key={i} fill={logColors[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Recent system activity" description="Latest actions recorded in the system">
        {s.activity.length ? (
          <ul className="divide-y divide-line">
            {s.activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5 text-sm">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
                <span className="flex-1 text-ink">{a.action}</span>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(a.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No activity yet.</p>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        {[
          { to: 'students',   label: 'View Students',    icon: GraduationCap },
          { to: 'placements', label: 'Manage Placements', icon: Briefcase },
          { to: 'logbooks',   label: 'Review Logbooks',  icon: BookOpen },
          { to: 'reports',    label: 'View Reports',      icon: FileBarChart },
        ].map(({ to, label, icon: Icon }) => (
          <CoordLink key={to} to={to} label={label} icon={Icon} />
        ))}
      </div>
    </div>
  )
}

function SupervisorDash() {
  const st = useApi('students', listStudents)
  const lg = useApi('logbooks', listLogbooks)
  const vs = useApi('visits', listVisits)
  const as = useApi('assessments', listAssessments)
  const rl = useRoleLink()
  if (st.isLoading || lg.isLoading) return <Loading />
  const err = st.error || lg.error
  if (err) return <ErrorBox error={err} />

  const pendingLogs = lg.data!.filter((l) => l.status === 'Submitted')
  const upcoming = vs.data?.filter((v) => v.status === 'Scheduled') ?? []
  const pendingAssessments = as.data?.filter((a) => a.marks.logbook === null || a.marks.report === null) ?? []

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Assigned Students" value={st.data!.length} icon={<GraduationCap size={18} />} />
        <Stat label="Logbooks to Review" value={pendingLogs.length} icon={<BookOpen size={18} />} />
        <Stat label="Upcoming Visits" value={upcoming.length} icon={<CalendarCheck size={18} />} />
        <Stat label="Pending Assessments" value={pendingAssessments.length} icon={<ClipboardCheck size={18} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Logbooks awaiting review">
          {pendingLogs.length ? (
            <ul className="divide-y divide-line">
              {pendingLogs.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{l.studentName}</p>
                    <p className="text-xs text-muted">Week {l.week} · {fmt(l.date)}</p>
                  </div>
                  <Badge>{l.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No logbooks pending" hint="Submitted logbooks from your students appear here." />
          )}
          {pendingLogs.length > 0 && (
            <Link to={rl('logbooks')} className="mt-3 block text-xs font-medium text-brand hover:underline">
              View all logbooks →
            </Link>
          )}
        </Card>

        <Card title="Upcoming visits">
          {upcoming.length ? (
            <ul className="divide-y divide-line">
              {upcoming.slice(0, 5).map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{v.studentName}</p>
                    <p className="text-xs text-muted">{fmt(v.date)}</p>
                  </div>
                  <Badge>{v.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No visits scheduled" hint="Schedule a visit from the Visits page." />
          )}
        </Card>
      </div>
    </div>
  )
}

function HostDash() {
  const ap = useApi('applications', listApplications)
  const vs = useApi('visits', listVisits)
  const as = useApi('assessments', listAssessments)
  const rl = useRoleLink()
  if (ap.isLoading) return <Loading />
  if (ap.error) return <ErrorBox error={ap.error} />

  const incoming = ap.data!.filter((a) => a.status === 'Awaiting Host Response')
  const confirmed = ap.data!.filter((a) => a.status === 'Confirmed')
  const upcoming = vs.data?.filter((v) => v.status === 'Scheduled') ?? []
  const evalPending = as.data?.filter((a) => a.marks.formD === null || a.formDDraft) ?? []

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Incoming Requests" value={incoming.length} icon={<Briefcase size={18} />} />
        <Stat label="Current Interns" value={confirmed.length} icon={<GraduationCap size={18} />} />
        <Stat label="Upcoming Visits" value={upcoming.length} icon={<CalendarCheck size={18} />} />
        <Stat label="Evaluations Due" value={evalPending.length} icon={<ClipboardCheck size={18} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Placement requests">
          {incoming.length ? (
            <ul className="divide-y divide-line">
              {incoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{a.studentName}</p>
                    <p className="text-xs text-muted">{fmt(a.start)} – {fmt(a.end)}</p>
                  </div>
                  <Badge>{a.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No pending requests" hint="New placement requests from the Coordinator appear here." />
          )}
          <Link to={rl('applications')} className="mt-3 block text-xs font-medium text-brand hover:underline">
            Manage placement requests →
          </Link>
        </Card>

        <Card title="Current interns">
          {confirmed.length ? (
            <ul className="divide-y divide-line">
              {confirmed.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{a.studentName}</p>
                    <p className="text-xs text-muted">Until {fmt(a.end)}</p>
                  </div>
                  <Badge>{a.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No current interns" />
          )}
        </Card>
      </div>
    </div>
  )
}

function MgmtDash() {
  const q = useApi('stats', stats)
  const rl = useRoleLink()
  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />
  const s = q.data!
  const rate = s.confirmed + s.completed
    ? Math.round((s.completed / (s.confirmed + s.completed)) * 100)
    : 0

  const statusData = [
    { n: 'Confirmed', v: s.confirmed, fill: '#16A34A' },
    { n: 'Completed', v: s.completed, fill: '#087F83' },
    { n: 'Pending', v: s.pending, fill: '#D97706' },
    { n: 'Rejected', v: s.rejected, fill: '#DC2626' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Students" value={s.students} icon={<GraduationCap size={18} />} />
        <Stat label="Confirmed Placements" value={s.confirmed} icon={<Briefcase size={18} />} />
        <Stat label="Host Organisations" value={s.hosts} icon={<Building2 size={18} />} />
        <Stat label="Completion Rate" value={`${rate}%`} icon={<TrendingUp size={18} />} />
        <Stat label="Results for Approval" value={s.awaitingApproval} icon={<ClipboardCheck size={18} />} />
        <Stat label="Published Results" value={s.published} icon={<CheckCircle size={18} />} />
        <Stat label="Active Supervisors" value={s.supervisors} icon={<Users size={18} />} />
        <Stat label="Completed Visits" value={s.visitsDone} icon={<CalendarCheck size={18} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Internship status overview">
          <div className="h-56" role="img" aria-label="Bar chart of internship statuses">
            <ResponsiveContainer>
              <BarChart data={statusData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="n" fontSize={11} tick={{ fill: '#64748B' }} />
                <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Quick actions">
          <div className="space-y-2">
            <Link
              to={rl('assessments')}
              className="flex items-center justify-between rounded-lg border border-line p-3 text-sm hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium">Review pending results</span>
              <Badge>Awaiting Approval</Badge>
            </Link>
            <Link
              to={rl('reports')}
              className="flex items-center justify-between rounded-lg border border-line p-3 text-sm hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium">View system reports</span>
              <FileBarChart size={16} className="text-muted" />
            </Link>
            <Link
              to={rl('students')}
              className="flex items-center justify-between rounded-lg border border-line p-3 text-sm hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium">Student overview</span>
              <GraduationCap size={16} className="text-muted" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
