import { useState } from 'react'
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, Table, Td, Tr, inputCls, Alert } from '../components/ui'
import { useAction, useApi } from '../hooks'
import { listApplications, listAssessments, saveMark } from '../services/api'
import type { Marks } from '../types'

export default function StudentFeedback() {
  const apps = useApi('applications', listApplications)
  const asmts = useApi('assessments', listAssessments)

  const [target, setTarget] = useState<{ id: string; name: string } | null>(null)
  const [val, setVal] = useState('')
  const [comments, setComments] = useState('')

  const save = useAction(
    ({ draft }: { draft: boolean }) => saveMark(target!.id, 'formD', Number(val), { draft, comments }),
    'Form D evaluation saved',
  )

  if (apps.isLoading) return <Loading />
  if (apps.error) return <ErrorBox error={apps.error} />

  const confirmed = apps.data!.filter((a) => a.status === 'Confirmed' || a.status === 'Completed')

  return (
    <div className="space-y-5">
      <PageHeader title="Student Feedback" description="Provide Form D performance evaluations for interns placed at your organisation." />

      <Alert type="info">
        Form D is your evaluation of the student's performance during their internship. You can save a draft and submit when ready.
      </Alert>

      <Card>
        {confirmed.length === 0 ? (
          <Empty title="No interns to evaluate" hint="Students with confirmed placements at your organisation appear here." />
        ) : (
          <Table head={['Student', 'Period', 'Form D Mark', 'Draft', 'Actions']}>
            {confirmed.map((a) => {
              const asmt = asmts.data?.find((x) => x.studentId === a.studentId)
              return (
                <Tr key={a.id}>
                  <Td><span className="font-medium">{a.studentName}</span></Td>
                  <Td><span className="text-xs text-muted">{a.start ? `${a.start} – ${a.end ?? ''}` : '—'}</span></Td>
                  <Td>
                    {asmt?.marks.formD !== null && asmt?.marks.formD !== undefined ? (
                      <span className="font-medium">{asmt.marks.formD}/100</span>
                    ) : (
                      <span className="text-muted">Not entered</span>
                    )}
                  </Td>
                  <Td>
                    {asmt?.formDDraft ? <Badge>Draft</Badge> : asmt?.marks.formD !== null && asmt?.marks.formD !== undefined ? <Badge>Submitted</Badge> : <span className="text-muted">—</span>}
                  </Td>
                  <Td>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setTarget({ id: a.studentId, name: a.studentName })
                      setVal(asmt?.marks.formD !== null && asmt?.marks.formD !== undefined ? String(asmt.marks.formD) : '')
                      setComments(asmt?.formDComments ?? '')
                    }}>
                      {asmt?.marks.formD !== null && asmt?.marks.formD !== undefined ? 'Edit' : 'Evaluate'}
                    </Button>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </Card>

      {target && (
        <Modal title={`Form D Evaluation — ${target.name}`} onClose={() => setTarget(null)}>
          <div className="space-y-4">
            <Field label="Performance mark (0 – 100)" required hint="Rate the student's overall performance during the internship.">
              <input type="number" min={0} max={100} className={inputCls} value={val} onChange={(e) => setVal(e.target.value)} />
            </Field>
            <Field label="Evaluation comments" hint="Provide specific feedback on the student's strengths and areas for improvement.">
              <textarea rows={4} className={inputCls} value={comments} onChange={(e) => setComments(e.target.value)} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => save.mutate({ draft: true }, { onSuccess: () => setTarget(null) })}>
              Save as draft
            </Button>
            <Button disabled={!val} onClick={() => save.mutate({ draft: false }, { onSuccess: () => setTarget(null) })}>
              Submit evaluation
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
