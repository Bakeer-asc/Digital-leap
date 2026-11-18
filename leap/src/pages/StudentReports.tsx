import { useState } from 'react'
import { z } from 'zod'
import { useZodForm } from '../lib/form'
import {
  Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal,
  PageHeader, Table, Td, Tr, inputCls, Alert,
} from '../components/ui'
import { useAction, useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { listReports, reviewReport, submitReport } from '../services/api'
import { fmt } from '../lib/dates'
import { CheckCircle, FileText, Send } from 'lucide-react'

const schema = z.object({
  title: z.string().min(5, 'Enter a report title (at least 5 characters).'),
  content: z.string().min(50, 'Report content must be at least 50 characters.'),
})

export default function StudentReports() {
  const { user } = useAuth()
  const q = useApi('reports', listReports)
  const isStudent = user!.role === 'student'
  const isSupervisor = user!.role === 'supervisor'

  const submit = useAction((v: z.infer<typeof schema>) => submitReport(v), 'Report submitted — your supervisor will review it')
  const review = useAction(
    ({ id, approved, feedback }: { id: string; approved: boolean; feedback: string }) => reviewReport(id, approved, feedback),
    'Review sent to student',
  )

  const [reviewing, setReviewing] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const f = useZodForm(schema)

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const reports = q.data!

  return (
    <div className="space-y-5">
      <PageHeader
        title={isStudent ? 'My Reports' : 'Student Reports'}
        description={isStudent ? 'Submit and track your internship reports.' : 'Review reports submitted by your assigned students.'}
      />

      {isStudent && (
        <Card title="Submit a report">
          <form className="space-y-4" onSubmit={f.handleSubmit((v) => submit.mutate(v, { onSuccess: () => f.reset() }))}>
            <Field label="Report title" required error={f.formState.errors.title?.message}>
              <input className={inputCls} {...f.register('title')} placeholder="e.g. Final Internship Report" />
            </Field>
            <Field label="Report content" required error={f.formState.errors.content?.message} hint="Write or paste your internship report content (minimum 50 characters).">
              <textarea rows={8} className={inputCls} {...f.register('content')} placeholder="Describe your internship experience, skills learned, challenges faced, and recommendations..." />
            </Field>
            <Button type="submit" disabled={submit.isPending}>
              <Send size={16} /> Submit report
            </Button>
          </form>
        </Card>
      )}

      <Card title="Report history" description={`${reports.length} total`}>
        {reports.length === 0 ? (
          <Empty
            title="No reports yet"
            hint={isStudent ? 'Submit your internship report above.' : 'Reports from your assigned students appear here.'}
          />
        ) : (
          <Table head={['Title', ...(isStudent ? [] : ['Student']), 'Submitted', 'Status', 'Feedback', 'Actions']}>
            {reports.map((r) => (
              <Tr key={r.id}>
                <Td><span className="font-medium">{r.title}</span></Td>
                {!isStudent && <Td>{r.studentName}</Td>}
                <Td><span className="text-xs text-muted">{fmt(r.submittedAt)}</span></Td>
                <Td><Badge>{r.status}</Badge></Td>
                <Td>
                  {r.feedback ? (
                    <p className="max-w-xs truncate text-xs text-muted">{r.feedback}</p>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td>
                  {isSupervisor && r.status === 'Submitted' && (
                    <Button size="sm" onClick={() => { setReviewing(r.id); setFeedback('') }}>
                      <FileText size={13} /> Review
                    </Button>
                  )}
                  {r.status === 'Approved' && (
                    <span className="flex items-center gap-1 text-xs text-ok">
                      <CheckCircle size={12} /> Approved
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {reviewing && (
        <Modal title="Review report" onClose={() => setReviewing(null)}>
          <Field label="Feedback to student" hint="Provide constructive feedback on the report.">
            <textarea className={inputCls} rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </Field>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => review.mutate({ id: reviewing, approved: false, feedback }, { onSuccess: () => setReviewing(null) })}>
              Request changes
            </Button>
            <Button onClick={() => review.mutate({ id: reviewing, approved: true, feedback }, { onSuccess: () => setReviewing(null) })}>
              <CheckCircle size={14} /> Approve report
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
