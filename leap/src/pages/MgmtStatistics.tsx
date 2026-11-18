import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { Card, ErrorBox, Loading, PageHeader, Stat } from '../components/ui'
import { useApi } from '../hooks'
import { stats } from '../services/api'
import { GraduationCap, Building2, Briefcase, ClipboardCheck, CalendarCheck, TrendingUp, Users, CheckCircle } from 'lucide-react'

export default function MgmtStatistics() {
  const q = useApi('stats', stats)
  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />
  const s = q.data!

  const completionRate = s.confirmed + s.completed ? Math.round((s.completed / (s.confirmed + s.completed)) * 100) : 0

  const statusData = [
    { n: 'Pending', v: s.pending, fill: '#D97706' },
    { n: 'Awaiting Host', v: s.awaitingHost, fill: '#2563EB' },
    { n: 'Confirmed', v: s.confirmed, fill: '#16A34A' },
    { n: 'Declined', v: s.declined, fill: '#DC2626' },
    { n: 'Completed', v: s.completed, fill: '#087F83' },
  ]

  const resultData = [
    { n: 'In Progress', v: s.assessmentsOpen },
    { n: 'Awaiting Approval', v: s.awaitingApproval },
    { n: 'Published', v: s.published },
  ]
  const resultColors = ['#D97706', '#2563EB', '#16A34A']

  const visitData = [
    { n: 'Scheduled', v: s.visitsScheduled, fill: '#2563EB' },
    { n: 'Completed', v: s.visitsDone, fill: '#16A34A' },
    { n: 'Cancelled', v: s.visitsCancelled, fill: '#DC2626' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Internship Statistics" description="System-wide statistics and performance indicators." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Students" value={s.students} icon={<GraduationCap size={18} />} />
        <Stat label="Confirmed Placements" value={s.confirmed} icon={<Briefcase size={18} />} />
        <Stat label="Host Organisations" value={s.hosts} icon={<Building2 size={18} />} />
        <Stat label="Completion Rate" value={`${completionRate}%`} icon={<TrendingUp size={18} />} />
        <Stat label="Pending Applications" value={s.pending} icon={<ClipboardCheck size={18} />} />
        <Stat label="Open Vacancies" value={s.vacancies} icon={<Users size={18} />} />
        <Stat label="Visits Completed" value={s.visitsDone} icon={<CalendarCheck size={18} />} />
        <Stat label="Published Results" value={s.published} icon={<CheckCircle size={18} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Applications by status">
          <div className="h-64" role="img" aria-label="Bar chart of applications by status">
            <ResponsiveContainer>
              <BarChart data={statusData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="n" fontSize={11} tick={{ fill: '#64748B' }} />
                <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="v" name="Count" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Assessment results">
          <div className="h-64" role="img" aria-label="Pie chart of assessment results">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={resultData} dataKey="v" nameKey="n" outerRadius={90} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine>
                  {resultData.map((_, i) => <Cell key={i} fill={resultColors[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Visit activity">
        <div className="h-56" role="img" aria-label="Bar chart of visit activity">
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
    </div>
  )
}
