import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, ErrorBox, Loading, PageHeader, Stat } from '../components/ui'
import { useApi } from '../hooks'
import { stats } from '../services/api'
import {
  GraduationCap, Building2, Briefcase, BookOpen, CalendarCheck,
  ClipboardCheck, TrendingUp, Users,
} from 'lucide-react'

export default function Reports() {
  const q = useApi('stats', stats)
  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />
  const s = q.data!

  const placementData = [
    { n: 'Pending', v: s.pending, fill: '#D97706' },
    { n: 'Awaiting Host', v: s.awaitingHost, fill: '#2563EB' },
    { n: 'Confirmed', v: s.confirmed, fill: '#16A34A' },
    { n: 'Declined', v: s.declined, fill: '#DC2626' },
    { n: 'Rejected', v: s.rejected, fill: '#6B7280' },
    { n: 'Completed', v: s.completed, fill: '#087F83' },
  ]

  const logData = [
    { n: 'Awaiting Review', v: s.logSubmitted },
    { n: 'Approved', v: s.logApproved },
    { n: 'Needs Revision', v: s.logRevision },
  ]
  const logColors = ['#2563EB', '#16A34A', '#D97706']

  const visitData = [
    { n: 'Scheduled', v: s.visitsScheduled, fill: '#2563EB' },
    { n: 'Completed', v: s.visitsDone, fill: '#16A34A' },
    { n: 'Cancelled', v: s.visitsCancelled, fill: '#DC2626' },
  ]

  const resultData = [
    { n: 'In Progress', v: s.assessmentsOpen },
    { n: 'Awaiting Approval', v: s.awaitingApproval },
    { n: 'Published', v: s.published },
  ]
  const resultColors = ['#D97706', '#2563EB', '#16A34A']

  const completionRate = s.confirmed + s.completed
    ? Math.round((s.completed / (s.confirmed + s.completed)) * 100)
    : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Management Reports"
        description="System-wide statistics and internship programme overview."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Registered Students" value={s.students} icon={<GraduationCap size={18} />} />
        <Stat label="Confirmed Placements" value={s.confirmed} icon={<Briefcase size={18} />} />
        <Stat label="Host Organisations" value={s.hosts} icon={<Building2 size={18} />} />
        <Stat label="Open Vacancy Slots" value={s.vacancies} icon={<Users size={18} />} />
        <Stat label="Pending Applications" value={s.pending} icon={<ClipboardCheck size={18} />} />
        <Stat label="Visits Completed" value={s.visitsDone} hint={`${s.visitsScheduled} scheduled`} icon={<CalendarCheck size={18} />} />
        <Stat label="Results for Approval" value={s.awaitingApproval} icon={<ClipboardCheck size={18} />} />
        <Stat label="Completion Rate" value={`${completionRate}%`} icon={<TrendingUp size={18} />} />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Placements by status" description="Current application and placement pipeline">
          <div className="h-64" role="img" aria-label="Bar chart of placements by status">
            <ResponsiveContainer>
              <BarChart data={placementData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="n" fontSize={11} tick={{ fill: '#64748B' }} />
                <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                  cursor={{ fill: '#F1F5F9' }}
                />
                <Bar dataKey="v" name="Count" radius={[4, 4, 0, 0]}>
                  {placementData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Logbook status" description="Review progress across all logbooks">
          <div className="h-64" role="img" aria-label="Pie chart of logbook status">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={logData}
                  dataKey="v"
                  nameKey="n"
                  outerRadius={90}
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  labelLine
                >
                  {logData.map((_, i) => <Cell key={i} fill={logColors[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Visit activity" description="Scheduled, completed and cancelled visits">
          <div className="h-64" role="img" aria-label="Bar chart of visit activity">
            <ResponsiveContainer>
              <BarChart data={visitData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="n" fontSize={11} tick={{ fill: '#64748B' }} />
                <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="v" name="Count" radius={[4, 4, 0, 0]}>
                  {visitData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Assessment results" description="Result processing pipeline">
          <div className="h-64" role="img" aria-label="Pie chart of assessment results">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={resultData}
                  dataKey="v"
                  nameKey="n"
                  outerRadius={90}
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  labelLine
                >
                  {resultData.map((_, i) => <Cell key={i} fill={resultColors[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Quick stats table */}
      <Card title="Summary statistics">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Metric</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ['Registered students', s.students],
                ['Confirmed placements', s.confirmed],
                ['Completed internships', s.completed],
                ['Pending applications', s.pending],
                ['Awaiting host response', s.awaitingHost],
                ['Declined placements', s.declined],
                ['Rejected applications', s.rejected],
                ['Logbooks submitted', s.logSubmitted],
                ['Logbooks approved', s.logApproved],
                ['Logbooks needing revision', s.logRevision],
                ['Visits scheduled', s.visitsScheduled],
                ['Visits completed', s.visitsDone],
                ['Results awaiting approval', s.awaitingApproval],
                ['Results published', s.published],
                ['Host organisations', s.hosts],
                ['Open vacancy slots', s.vacancies],
              ].map(([label, value]) => (
                <tr key={label as string} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-muted">{label}</td>
                  <td className="px-4 py-2.5 font-semibold text-ink">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
