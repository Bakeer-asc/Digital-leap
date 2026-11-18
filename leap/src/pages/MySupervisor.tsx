import { Badge, Card, DetailItem, Empty, ErrorBox, Loading, PageHeader, SectionTitle, Table, Td, Tr } from '../components/ui'
import { useApi } from '../hooks'
import { listApplications, listVisits } from '../services/api'
import { fmt } from '../lib/dates'
import { Mail, Phone, Building2, CalendarCheck } from 'lucide-react'

export default function MySupervisor() {
  const apps = useApi('applications', listApplications)
  const visits = useApi('visits', listVisits)

  if (apps.isLoading) return <Loading />
  if (apps.error) return <ErrorBox error={apps.error} />

  const a = apps.data!.find((x) => ['Confirmed', 'Completed'].includes(x.status))
  const myVisits = visits.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="My Supervisor" description="Your assigned academic supervisor and visit history." />

      {!a || !a.supervisorName ? (
        <Card><Empty title="No supervisor assigned" hint="Your supervisor will be assigned by the LEAP Coordinator." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Supervisor information">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-navy text-lg font-bold text-white">
                  {a.supervisorName[0]}
                </span>
                <div>
                  <p className="font-semibold text-ink">{a.supervisorName}</p>
                  <p className="text-sm text-muted">Academic Supervisor</p>
                </div>
              </div>
              <SectionTitle>Contact</SectionTitle>
              <div className="grid grid-cols-1 gap-3">
                <DetailItem label="Name" value={a.supervisorName} />
              </div>
              <p className="text-sm text-muted">
                Contact your supervisor for questions about your internship progress, logbook reviews, or visit scheduling.
              </p>
            </div>
          </Card>

          <Card title="Visit history" description={`${myVisits.length} total visits`}>
            {myVisits.length === 0 ? (
              <Empty title="No visits scheduled" hint="Your supervisor will schedule visits during your internship." />
            ) : (
              <Table head={['Date', 'Type', 'Status']}>
                {myVisits.map((v) => (
                  <Tr key={v.id}>
                    <Td>{fmt(v.date)}</Td>
                    <Td><span className="text-xs text-muted">{v.visitType ?? 'On-site'}</span></Td>
                    <Td><Badge>{v.status}</Badge></Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
