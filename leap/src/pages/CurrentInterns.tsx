import { Badge, Card, Empty, ErrorBox, Loading, PageHeader, Table, Td, Tr } from '../components/ui'
import { useApi } from '../hooks'
import { listApplications, listAssessments } from '../services/api'
import { fmt, elapsedPct } from '../lib/dates'

export default function CurrentInterns() {
  const apps = useApi('applications', listApplications)
  const asmts = useApi('assessments', listAssessments)

  if (apps.isLoading) return <Loading />
  if (apps.error) return <ErrorBox error={apps.error} />

  const confirmed = apps.data!.filter((a) => a.status === 'Confirmed')
  const completed = apps.data!.filter((a) => a.status === 'Completed')

  return (
    <div className="space-y-5">
      <PageHeader title="Current Interns" description="Students currently placed at your organisation." />

      <Card title="Active interns" description={`${confirmed.length} currently placed`}>
        {confirmed.length === 0 ? (
          <Empty title="No current interns" hint="Students with confirmed placements at your organisation appear here." />
        ) : (
          <Table head={['Student', 'Programme', 'Period', 'Progress', 'Supervisor', 'Form D Status']}>
            {confirmed.map((a) => {
              const asmt = asmts.data?.find((x) => x.studentId === a.studentId)
              const formDStatus = asmt?.marks.formD !== null && asmt?.marks.formD !== undefined
                ? (asmt.formDDraft ? 'Draft saved' : 'Submitted')
                : 'Pending'
              return (
                <Tr key={a.id}>
                  <Td><span className="font-medium">{a.studentName}</span></Td>
                  <Td><span className="text-muted">—</span></Td>
                  <Td>{fmt(a.start)} – {fmt(a.end)}</Td>
                  <Td>
                    {a.start && a.end ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-line">
                          <div className="h-2 rounded-full bg-teal" style={{ width: `${elapsedPct(a.start, a.end)}%` }} />
                        </div>
                        <span className="text-xs text-muted">{elapsedPct(a.start, a.end)}%</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </Td>
                  <Td>{a.supervisorName ?? <span className="text-muted">Not assigned</span>}</Td>
                  <Td>
                    <Badge>{formDStatus}</Badge>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </Card>

      {completed.length > 0 && (
        <Card title="Completed internships" description={`${completed.length} finished`}>
          <Table head={['Student', 'Period', 'Supervisor']}>
            {completed.map((a) => (
              <Tr key={a.id}>
                <Td><span className="font-medium">{a.studentName}</span></Td>
                <Td>{fmt(a.start)} – {fmt(a.end)}</Td>
                <Td>{a.supervisorName ?? <span className="text-muted">—</span>}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  )
}
