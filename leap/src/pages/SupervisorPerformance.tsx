import { Card, Empty, ErrorBox, Loading, PageHeader, Stat, Table, Td, Tr } from '../components/ui'
import { useApi } from '../hooks'
import { listAssessments, listLogbooks, listSupervisors, listVisits, stats } from '../services/api'
import { Users, ClipboardCheck, CalendarCheck, BookOpen } from 'lucide-react'

export default function SupervisorPerformance() {
  const sup = useApi('supervisors', listSupervisors)
  const logs = useApi('logbooks', listLogbooks)
  const visits = useApi('visits', listVisits)
  const asmts = useApi('assessments', listAssessments)
  const st = useApi('stats', stats)

  if (sup.isLoading) return <Loading />
  if (sup.error) return <ErrorBox error={sup.error} />

  const supervisors = sup.data!

  return (
    <div className="space-y-5">
      <PageHeader title="Supervisor Performance" description="Activity statistics for academic supervisors." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Supervisors" value={st.data?.supervisors ?? supervisors.length} icon={<Users size={18} />} />
        <Stat label="Logbooks Reviewed" value={logs.data?.filter((l) => l.status === 'Approved').length ?? 0} icon={<BookOpen size={18} />} />
        <Stat label="Visits Completed" value={st.data?.visitsDone ?? 0} icon={<CalendarCheck size={18} />} />
        <Stat label="Assessments Started" value={asmts.data?.length ?? 0} icon={<ClipboardCheck size={18} />} />
      </div>

      <Card title="Supervisor activity report">
        {supervisors.length === 0 ? (
          <Empty title="No supervisors" hint="Supervisors appear here once created by the Coordinator." />
        ) : (
          <Table head={['Supervisor', 'Department', 'Assigned Students', 'Logbooks Reviewed', 'Visits Done', 'Assessments']}>
            {supervisors.map((s) => {
              const supLogs = logs.data?.filter((l) => l.studentName !== '' && sup.data?.some(x => x.id === s.id)) ?? []
              const supVisits = visits.data?.filter((v) => v.supervisorName === s.name) ?? []
              const supAsmts = asmts.data?.filter((a) => true) ?? [] // filtered by visibleStudentIds already
              return (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{s.name[0]}</span>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </Td>
                  <Td>{s.department ?? <span className="text-muted">—</span>}</Td>
                  <Td><span className="font-semibold">{s.assignedCount}</span></Td>
                  <Td>{supLogs.filter((l) => l.status === 'Approved').length}</Td>
                  <Td>{supVisits.filter((v) => v.status === 'Completed').length}</Td>
                  <Td>{supAsmts.filter((a) => a.marks.logbook !== null || a.marks.report !== null).length}</Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}
