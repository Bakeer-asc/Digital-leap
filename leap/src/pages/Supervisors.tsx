import { useState } from 'react'
import {
  Badge, Button, Card, DetailItem, Empty, ErrorBox, Loading, Modal,
  PageHeader, SearchInput, SectionTitle, Table, Td, Tr, inputCls,
} from '../components/ui'
import { useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { listApplications, listSupervisors } from '../services/api'
import { fmt } from '../lib/dates'
import { Mail, Phone, Building2, GraduationCap } from 'lucide-react'

export default function Supervisors() {
  const { user } = useAuth()
  const q = useApi('supervisors', listSupervisors)
  const apps = useApi('applications', listApplications)
  const [term, setTerm] = useState('')
  const [detail, setDetail] = useState<string | null>(null)

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const supervisors = q.data!
  const filtered = supervisors.filter((s) =>
    `${s.name} ${s.staffId ?? ''} ${s.department ?? ''} ${s.email}`.toLowerCase().includes(term.toLowerCase())
  )

  const selected = detail ? supervisors.find((s) => s.id === detail) : null
  const selectedStudents = selected ? apps.data?.filter((a) => a.supervisorId === selected.id) ?? [] : []

  return (
    <div className="space-y-5">
      <PageHeader title="Academic Supervisors" description="Directory of supervisors and their assigned students." />

      <Card>
        <div className="mb-4">
          <SearchInput value={term} onChange={setTerm} placeholder="Search name, staff ID or department…" className="w-full sm:w-72" />
        </div>

        {filtered.length === 0 ? (
          <Empty title="No supervisors found" hint="Supervisors created by the Coordinator appear here." />
        ) : (
          <Table head={['Name', 'Staff ID', 'Department', 'Email', 'Phone', 'Assigned', '']}>
            {filtered.map((s) => (
              <Tr key={s.id} onClick={() => setDetail(s.id)}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-semibold text-white">
                      {s.name[0]}
                    </span>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </Td>
                <Td>{s.staffId ?? <span className="text-muted">—</span>}</Td>
                <Td>{s.department ?? <span className="text-muted">—</span>}</Td>
                <Td>{s.email}</Td>
                <Td>{s.phone ?? <span className="text-muted">—</span>}</Td>
                <Td>
                  <span className={`font-semibold ${s.assignedCount > 0 ? 'text-ink' : 'text-muted'}`}>
                    {s.assignedCount}
                  </span>
                </Td>
                <Td>
                  <Button size="sm" variant="ghost">View</Button>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-xs text-muted">{filtered.length} supervisor{filtered.length !== 1 ? 's' : ''}</p>
      </Card>

      {selected && (
        <Modal title={`Supervisor: ${selected.name}`} onClose={() => setDetail(null)} wide>
          <div className="space-y-4">
            <SectionTitle>Profile</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Full Name" value={selected.name} />
              <DetailItem label="Staff ID" value={selected.staffId} />
              <DetailItem label="Department" value={selected.department} />
              <DetailItem label="Email" value={selected.email} />
              <DetailItem label="Phone" value={selected.phone} />
              <DetailItem label="Assigned Students" value={selected.assignedCount} />
            </div>

            <SectionTitle>Assigned Students</SectionTitle>
            {selectedStudents.length === 0 ? (
              <p className="text-sm text-muted">No students currently assigned.</p>
            ) : (
              <Table head={['Student', 'Host Organisation', 'Period', 'Status']}>
                {selectedStudents.map((a) => (
                  <Tr key={a.id}>
                    <Td><span className="font-medium">{a.studentName}</span></Td>
                    <Td>{a.hostName ?? <span className="text-muted">—</span>}</Td>
                    <Td>{a.start ? `${fmt(a.start)} – ${fmt(a.end)}` : <span className="text-muted">—</span>}</Td>
                    <Td><Badge>{a.status}</Badge></Td>
                  </Tr>
                ))}
              </Table>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
