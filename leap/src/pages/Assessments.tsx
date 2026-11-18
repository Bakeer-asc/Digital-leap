import { useState } from 'react'
import {
  Alert, Badge, Button, Card, Empty, ErrorBox, Field, Loading, Modal,
  PageHeader, Table, Td, Tr, inputCls,
} from '../components/ui'
import { useAction, useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { compute, listAssessments, managementDecision, saveMark, verifyResult } from '../services/api'
import type { Marks } from '../types'
import { CheckCircle, Send, RotateCcw } from 'lucide-react'

const LABEL: Record<keyof Marks, string> = {
  logbook: 'Logbook / Diary',
  formD: 'Supervisor Form D',
  selfEval: 'Self Evaluation',
  report: 'Internship Report',
  careerFair: 'Career Fair',
}

const MINE = {
  student:     ['selfEval'],
  supervisor:  ['logbook', 'report'],
  host:        ['formD'],
  coordinator: ['careerFair'],
  management:  [],
} as const

export default function Assessments() {
  const { user } = useAuth()
  const role = user!.role
  const q = useApi('assessments', listAssessments)
  const [target, setTarget] = useState<{ id: string; name: string; kind: keyof Marks } | null>(null)
  const [val, setVal] = useState('')
  const [comments, setComments] = useState('')
  const [ret, setRet] = useState<string | null>(null)
  const [why, setWhy] = useState('')

  const mark = useAction(
    ({ draft }: { draft: boolean }) =>
      saveMark(target!.id, target!.kind, Number(val), { draft, comments }),
    'Mark saved',
  )
  const comp = useAction(compute, 'Result computed')
  const ver = useAction(verifyResult, 'Verified — sent to University Management')
  const dec = useAction(
    ({ id, d, r }: { id: string; d: 'approve' | 'return' | 'publish'; r?: string }) =>
      managementDecision(id, d, r),
    'Decision recorded',
  )

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />
  const rows = q.data!

  const pageTitle = {
    management:  'Result Approvals',
    student:     'My Assessment',
    coordinator: 'Assessment Records',
    supervisor:  'Assessment Records',
    host:        'Evaluations',
  }[role]

  const pageDesc = {
    management:  'Review and approve internship results submitted by the LEAP Coordinator.',
    student:     'Your internship assessment marks and final result.',
    coordinator: 'Manage student assessment marks, compute and verify results.',
    supervisor:  'Enter logbook and report marks for your assigned students.',
    host:        'Submit your Form D evaluation for placed interns.',
  }[role]

  return (
    <div className="space-y-5">
      <PageHeader title={pageTitle} description={pageDesc} />

      {role === 'student' && (
        <Alert type="info">
          Your result is visible only after University Management publishes it. You can record your self-evaluation mark at any time.
        </Alert>
      )}

      <Card>
        {rows.length === 0 ? (
          <Empty
            title="Nothing to show yet"
            hint={
              role === 'management'
                ? 'Verified results appear here for approval.'
                : 'Assessments open for students with confirmed placements.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Student</th>
                  {(Object.keys(LABEL) as (keyof Marks)[]).map((k) => (
                    <th key={k} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted whitespace-nowrap">
                      {LABEL[k]}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.studentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{r.studentName}</td>
                    {(Object.keys(LABEL) as (keyof Marks)[]).map((k) => (
                      <td key={k} className="px-4 py-3">
                        {r.marks[k] !== null && r.marks[k] !== undefined
                          ? (
                            <span className="font-medium">{r.marks[k]}</span>
                          )
                          : <span className="text-muted">—</span>
                        }
                        {k === 'formD' && r.formDDraft && (
                          <span className="ml-1 text-xs text-warn">(draft)</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <Badge>{r.status}</Badge>
                        {r.grade && (
                          <p className="text-xs font-semibold text-ink">
                            {r.overall}% · Grade <span className="text-ok">{r.grade}</span>
                          </p>
                        )}
                        {r.returnReason && (
                          <p className="text-xs text-bad">Returned: {r.returnReason}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {/* Mark entry buttons */}
                        {(MINE[role] as readonly (keyof Marks)[]).map((k) =>
                          !['Awaiting Approval', 'Approved', 'Published'].includes(r.status) ? (
                            <Button
                              key={k}
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setTarget({ id: r.studentId, name: r.studentName, kind: k })
                                setVal(String(r.marks[k] ?? ''))
                                setComments(r.formDComments)
                              }}
                            >
                              {LABEL[k]}
                            </Button>
                          ) : null,
                        )}

                        {/* Coordinator: compute and verify */}
                        {role === 'coordinator' && ['In Progress', 'Returned', 'Computed'].includes(r.status) && (
                          <Button size="sm" onClick={() => comp.mutate(r.studentId)}>
                            Compute grade
                          </Button>
                        )}
                        {role === 'coordinator' && r.status === 'Computed' && (
                          <Button size="sm" variant="secondary" onClick={() => ver.mutate(r.studentId)}>
                            <Send size={13} /> Verify & send
                          </Button>
                        )}

                        {/* Management: approve / return / publish */}
                        {role === 'management' && r.status === 'Awaiting Approval' && (
                          <>
                            <Button size="sm" onClick={() => dec.mutate({ id: r.studentId, d: 'approve' })}>
                              <CheckCircle size={13} /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setRet(r.studentId); setWhy('') }}
                            >
                              <RotateCcw size={13} /> Return
                            </Button>
                          </>
                        )}
                        {role === 'management' && r.status === 'Approved' && (
                          <Button size="sm" variant="secondary" onClick={() => dec.mutate({ id: r.studentId, d: 'publish' })}>
                            Publish to student
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Mark entry modal */}
      {target && (
        <Modal title={`${LABEL[target.kind]} — ${target.name}`} onClose={() => setTarget(null)}>
          <div className="space-y-4">
            <Field label="Mark (0 – 100)" required hint="Enter the numeric mark between 0 and 100.">
              <input
                type="number"
                min={0}
                max={100}
                className={inputCls}
                value={val}
                onChange={(e) => setVal(e.target.value)}
              />
            </Field>
            {target.kind === 'formD' && (
              <Field label="Evaluation comments">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </Field>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            {target.kind === 'formD' && (
              <Button
                variant="ghost"
                onClick={() => mark.mutate({ draft: true }, { onSuccess: () => setTarget(null) })}
              >
                Save as draft
              </Button>
            )}
            <Button
              onClick={() => mark.mutate({ draft: false }, { onSuccess: () => setTarget(null) })}
              disabled={!val}
            >
              {target.kind === 'formD' ? 'Submit evaluation' : 'Save mark'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Return result modal */}
      {ret && (
        <Modal title="Return result for correction" onClose={() => setRet(null)}>
          <Field label="Reason for returning" required hint="The LEAP Coordinator will be notified.">
            <textarea rows={3} className={inputCls} value={why} onChange={(e) => setWhy(e.target.value)} />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRet(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() =>
                dec.mutate({ id: ret, d: 'return', r: why }, { onSuccess: () => setRet(null) })
              }
            >
              Return result
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
