import { useState } from 'react'
import { z } from 'zod'
import { useZodForm } from '../lib/form'
import {
  Alert, Badge, Button, Card, Confirm, DetailItem, Empty, ErrorBox, Field,
  Loading, Modal, PageHeader, SearchInput, SectionTitle, Table, Td, Tr,
  inputCls, useToast,
} from '../components/ui'
import { useAction, useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import {
  addHost, addVacancy, adminResetPassword, createUser, listHosts,
  listStudents, listSupervisors, listUsers, setUserState, updateHost,
  updateUserProfile, verifyHost, verifyStudent,
} from '../services/api'
import { SECTORS } from '../lib/constants'
import { ROLE_LABEL } from '../layouts/AppLayout'
import type { Role } from '../types'
import { Plus, Edit2, Key, Shield, ShieldOff, Unlock } from 'lucide-react'

// ---- Students Page ----
export function StudentsPage() {
  const { user } = useAuth()
  const q = useApi('students', listStudents)
  const ver = useAction(verifyStudent, 'Student verified')
  const [term, setTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [detail, setDetail] = useState<string | null>(null)

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const all = q.data!
  const rows = all.filter((s) => {
    const matchTerm = `${s.name} ${s.regNo} ${s.programme}`.toLowerCase().includes(term.toLowerCase())
    const matchStatus = !statusFilter || s.status === statusFilter
    return matchTerm && matchStatus
  })

  const statuses = [...new Set(all.map((s) => s.status))]
  const selected = detail ? all.find((s) => s.id === detail) : null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Student Records"
        description="All registered students and their placement status."
      />

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <SearchInput
            value={term}
            onChange={setTerm}
            placeholder="Search name, reg. number or programme…"
            className="w-full sm:w-72"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputCls} w-full sm:w-48`}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {rows.length === 0 ? (
          <Empty
            title="No students found"
            hint={
              term || statusFilter
                ? 'Try adjusting your search or filter.'
                : user!.role === 'supervisor'
                  ? 'Students allocated to you by the Coordinator appear here.'
                  : 'No students are registered yet.'
            }
          />
        ) : (
          <Table head={['Name', 'Reg. No.', 'Programme', 'Semester', 'Profile', 'Placement', 'Verified', '']}>
            {rows.map((s) => (
              <Tr key={s.id} onClick={() => setDetail(s.id)}>
                <Td><span className="font-medium">{s.name}</span></Td>
                <Td>{s.regNo || <span className="text-muted">—</span>}</Td>
                <Td>{s.programme || <span className="text-muted">—</span>}</Td>
                <Td>{s.semester || <span className="text-muted">—</span>}</Td>
                <Td>
                  <span className={`text-xs font-medium ${s.complete ? 'text-ok' : 'text-warn'}`}>
                    {s.complete ? 'Complete' : 'Incomplete'}
                  </span>
                </Td>
                <Td><Badge>{s.status}</Badge></Td>
                <Td>
                  {s.verified ? (
                    <Badge>Verified</Badge>
                  ) : user!.role === 'coordinator' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); ver.mutate(s.id) }}
                    >
                      Verify
                    </Button>
                  ) : (
                    <span className="text-xs text-muted">Not verified</span>
                  )}
                </Td>
                <Td>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetail(s.id) }}>
                    View
                  </Button>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-xs text-muted">{rows.length} of {all.length} students</p>
      </Card>

      {selected && (
        <Modal title={`Student: ${selected.name}`} onClose={() => setDetail(null)}>
          <div className="space-y-4">
            <SectionTitle>Personal Information</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Full Name" value={selected.name} />
              <DetailItem label="Registration No." value={selected.regNo || '—'} />
              <DetailItem label="Programme" value={selected.programme || '—'} />
              <DetailItem label="Semester" value={selected.semester || '—'} />
              <DetailItem label="Phone" value={selected.phone || '—'} />
              <DetailItem label="Preferred Sector" value={selected.preferredSector || '—'} />
            </div>
            <SectionTitle>Status</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Profile" value={selected.complete ? 'Complete' : 'Incomplete'} />
              <DetailItem label="Placement Status" value={<Badge>{selected.status}</Badge>} />
              <DetailItem label="Verified" value={selected.verified ? 'Yes' : 'No'} />
            </div>
            {user!.role === 'coordinator' && !selected.verified && (
              <div className="pt-2">
                <Button onClick={() => { ver.mutate(selected.id); setDetail(null) }}>
                  Verify student
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---- Hosts Page ----
export function HostsPage() {
  const { user } = useAuth()
  const q = useApi('hosts', listHosts)
  const ver = useAction(verifyHost, 'Host verified')
  const addH = useAction(addHost, 'Host organisation added')
  const addV = useAction(addVacancy, 'Vacancy added')
  const updH = useAction(({ id, p }: { id: string; p: Parameters<typeof updateHost>[1] }) => updateHost(id, p), 'Organisation updated')
  const toast = useToast()

  const [addHostOpen, setAddHostOpen] = useState(false)
  const [addVacOpen, setAddVacOpen] = useState(false)
  const [editHost, setEditHost] = useState<string | null>(null)
  const [term, setTerm] = useState('')

  const hSchema = z.object({
    name: z.string().min(2, 'Enter a name.'),
    sector: z.string().min(1, 'Choose a sector.'),
    address: z.string().min(3, 'Enter an address.'),
    contactEmail: z.string().email('Enter a valid email.'),
    phone: z.string().optional(),
    website: z.string().optional(),
    contactPerson: z.string().optional(),
    description: z.string().optional(),
  })
  const vSchema = z.object({
    hostId: z.string().min(1, 'Choose an organisation.'),
    title: z.string().min(3, 'Enter a title.'),
    capacity: z.coerce.number().min(1, 'At least 1.'),
    description: z.string().optional(),
  })

  const hf = useZodForm(hSchema)
  const vf = useZodForm(vSchema)
  const ef = useZodForm(hSchema)

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const coord = user!.role === 'coordinator'
  const isHost = user!.role === 'host'
  const canVac = coord || isHost
  const filtered = q.data!.filter((h) => h.name.toLowerCase().includes(term.toLowerCase()))
  const editing = editHost ? q.data!.find((h) => h.id === editHost) : null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Host Organisations"
        description="Registered host organisations and their available vacancies."
        action={
          coord ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAddVacOpen(true)}>
                <Plus size={14} /> Add vacancy
              </Button>
              <Button size="sm" onClick={() => setAddHostOpen(true)}>
                <Plus size={14} /> Add organisation
              </Button>
            </div>
          ) : undefined
        }
      />

      {!isHost && (
        <div className="flex gap-3">
          <SearchInput
            value={term}
            onChange={setTerm}
            placeholder="Search organisations…"
            className="w-full sm:w-64"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Card><Empty title="No host organisations found" /></Card>
      ) : (
        filtered.map((h) => (
          <Card
            key={h.id}
            title={h.name}
            description={`${h.sector} · ${h.type ?? ''}`}
            action={
              <div className="flex items-center gap-2">
                {h.verified ? (
                  <Badge>Verified</Badge>
                ) : coord ? (
                  <Button size="sm" variant="ghost" onClick={() => ver.mutate(h.id)}>
                    Verify
                  </Button>
                ) : (
                  <Badge>Pending</Badge>
                )}
                {(coord || (isHost && user!.hostId === h.id)) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      ef.reset({
                        name: h.name, sector: h.sector, address: h.address,
                        contactEmail: h.contactEmail, phone: h.phone ?? '',
                        website: h.website ?? '', contactPerson: h.contactPerson ?? '',
                        description: h.description ?? '',
                      })
                      setEditHost(h.id)
                    }}
                  >
                    <Edit2 size={14} /> Edit
                  </Button>
                )}
              </div>
            }
          >
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <DetailItem label="Address" value={h.address} />
              <DetailItem label="Contact Email" value={h.contactEmail} />
              {h.phone && <DetailItem label="Phone" value={h.phone} />}
              {h.contactPerson && <DetailItem label="Contact Person" value={h.contactPerson} />}
              {h.website && (
                <DetailItem
                  label="Website"
                  value={<a href={h.website} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{h.website}</a>}
                />
              )}
              {h.description && (
                <div className="col-span-full">
                  <DetailItem label="Description" value={h.description} />
                </div>
              )}
            </div>

            <SectionTitle>Vacancies ({h.vacancies.length})</SectionTitle>
            {h.vacancies.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No vacancies listed.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-slate-50">
                      {['Vacancy', 'Capacity', 'Filled', 'Available', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {h.vacancies.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium">{v.title}</td>
                        <td className="px-4 py-2.5">{v.capacity}</td>
                        <td className="px-4 py-2.5">{v.filled}</td>
                        <td className="px-4 py-2.5 font-medium text-ok">{v.capacity - v.filled}</td>
                        <td className="px-4 py-2.5">
                          {v.filled >= v.capacity ? (
                            <Badge>Completed</Badge>
                          ) : v.open ? (
                            <Badge>Confirmed</Badge>
                          ) : (
                            <Badge>Declined</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))
      )}

      {/* Add Organisation Modal */}
      {addHostOpen && (
        <Modal title="Register host organisation" onClose={() => { setAddHostOpen(false); hf.reset() }}>
          <form
            className="space-y-4"
            onSubmit={hf.handleSubmit((v) =>
              addH.mutate(v, { onSuccess: () => { setAddHostOpen(false); hf.reset() } })
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Organisation name" required error={hf.formState.errors.name?.message}>
                <input className={inputCls} {...hf.register('name')} />
              </Field>
              <Field label="Sector" required error={hf.formState.errors.sector?.message}>
                <select className={inputCls} {...hf.register('sector')}>
                  <option value="">Choose…</option>
                  {SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Address" required error={hf.formState.errors.address?.message}>
                <input className={inputCls} {...hf.register('address')} />
              </Field>
              <Field label="Contact email" required error={hf.formState.errors.contactEmail?.message}>
                <input type="email" className={inputCls} {...hf.register('contactEmail')} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} {...hf.register('phone')} />
              </Field>
              <Field label="Contact person">
                <input className={inputCls} {...hf.register('contactPerson')} />
              </Field>
              <Field label="Website">
                <input type="url" className={inputCls} {...hf.register('website')} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <textarea rows={3} className={inputCls} {...hf.register('description')} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddHostOpen(false)}>Cancel</Button>
              <Button type="submit">Add organisation</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Organisation Modal */}
      {editHost && editing && (
        <Modal title={`Edit: ${editing.name}`} onClose={() => setEditHost(null)}>
          <form
            className="space-y-4"
            onSubmit={ef.handleSubmit((v) =>
              updH.mutate({ id: editHost, p: v }, { onSuccess: () => setEditHost(null) })
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Organisation name" required error={ef.formState.errors.name?.message}>
                <input className={inputCls} {...ef.register('name')} />
              </Field>
              <Field label="Sector" required error={ef.formState.errors.sector?.message}>
                <select className={inputCls} {...ef.register('sector')}>
                  <option value="">Choose…</option>
                  {SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Address" required error={ef.formState.errors.address?.message}>
                <input className={inputCls} {...ef.register('address')} />
              </Field>
              <Field label="Contact email" required error={ef.formState.errors.contactEmail?.message}>
                <input type="email" className={inputCls} {...ef.register('contactEmail')} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} {...ef.register('phone')} />
              </Field>
              <Field label="Contact person">
                <input className={inputCls} {...ef.register('contactPerson')} />
              </Field>
              <Field label="Website">
                <input type="url" className={inputCls} {...ef.register('website')} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <textarea rows={3} className={inputCls} {...ef.register('description')} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditHost(null)}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Vacancy Modal */}
      {addVacOpen && (
        <Modal title="Add vacancy" onClose={() => { setAddVacOpen(false); vf.reset() }}>
          <form
            className="space-y-4"
            onSubmit={vf.handleSubmit((v) =>
              addV.mutate(v, { onSuccess: () => { setAddVacOpen(false); vf.reset() } })
            )}
          >
            <Field label="Organisation" required error={vf.formState.errors.hostId?.message}>
              <select className={inputCls} {...vf.register('hostId')}>
                <option value="">Choose…</option>
                {q.data!.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Vacancy title" required error={vf.formState.errors.title?.message}>
                <input className={inputCls} {...vf.register('title')} />
              </Field>
              <Field label="Capacity" required error={vf.formState.errors.capacity?.message}>
                <input type="number" min={1} className={inputCls} {...vf.register('capacity')} />
              </Field>
            </div>
            <Field label="Description">
              <textarea rows={2} className={inputCls} {...vf.register('description')} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddVacOpen(false)}>Cancel</Button>
              <Button type="submit">Add vacancy</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ---- Users / Accounts Page ----
const ROLES: Role[] = ['student', 'coordinator', 'supervisor', 'host', 'management']

export function UsersPage() {
  const q = useApi('users', listUsers)
  const qSup = useApi('supervisors', listSupervisors)
  const upd = useAction(
    ({ id, s }: { id: string; s: Parameters<typeof setUserState>[1] }) => setUserState(id, s),
    'Account updated',
  )
  const create = useAction(createUser, 'Account created')
  const reset = useAction(
    ({ id, pw }: { id: string; pw: string }) => adminResetPassword(id, pw),
    'Password reset',
  )
  const updateProf = useAction(
    ({ id, p }: { id: string; p: Parameters<typeof updateUserProfile>[1] }) => updateUserProfile(id, p),
    'Profile updated',
  )

  const [term, setTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [createOpen, setCreateOpen] = useState(false)
  const [resetUser, setResetUser] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ id: string; label: string; action: () => void } | null>(null)
  const [newPw, setNewPw] = useState('')

  const createSchema = z.object({
    name: z.string().min(2, 'Enter a name.'),
    email: z.string().email('Enter a valid email.'),
    role: z.enum(['student', 'coordinator', 'supervisor', 'host', 'management'] as const),
    password: z.string().min(8, 'At least 8 characters.').regex(/[A-Z]/, 'Include uppercase.').regex(/[0-9]/, 'Include a number.'),
    staffId: z.string().optional(),
    department: z.string().optional(),
    phone: z.string().optional(),
  })
  const editSchema = z.object({
    name: z.string().min(2, 'Enter a name.'),
    staffId: z.string().optional(),
    department: z.string().optional(),
    phone: z.string().optional(),
  })

  const cf = useZodForm(createSchema)
  const ef = useZodForm(editSchema)

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const all = q.data!
  const rows = all.filter((u) => {
    const matchTerm = `${u.name} ${u.email}`.toLowerCase().includes(term.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchTerm && matchRole
  })

  const editing = editUser ? all.find((u) => u.id === editUser) : null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounts & Roles"
        description="Manage user accounts, roles and access permissions."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Create account
          </Button>
        }
      />

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <SearchInput
            value={term}
            onChange={setTerm}
            placeholder="Search name or email…"
            className="w-full sm:w-72"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | '')}
            className={`${inputCls} w-full sm:w-44`}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>

        <Table head={['Name', 'Email', 'Role', 'Status', 'Created', 'Last Login', 'Actions']}>
          {rows.map((u) => {
            const state = u.locked ? 'Locked' : u.active ? 'Active' : 'Deactivated'
            return (
              <Tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-semibold text-white">
                      {u.name[0]}
                    </span>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </Td>
                <Td>{u.email}</Td>
                <Td>
                  <Badge>{state === 'Active' ? 'Active' : state}</Badge>
                </Td>
                <Td>{ROLE_LABEL[u.role]}</Td>
                <Td>
                  <span className="text-xs text-muted">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '—'}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-muted">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-GB') : '—'}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Edit profile"
                      onClick={() => {
                        ef.reset({ name: u.name, staffId: u.staffId ?? '', department: u.department ?? '', phone: u.phone ?? '' })
                        setEditUser(u.id)
                      }}
                    >
                      <Edit2 size={13} />
                    </Button>
                    {u.locked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Unlock account"
                        onClick={() =>
                          setConfirmAction({
                            id: u.id,
                            label: `Unlock ${u.name}'s account?`,
                            action: () => upd.mutate({ id: u.id, s: { unlock: true } }),
                          })
                        }
                      >
                        <Unlock size={13} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={u.active ? 'ghost' : 'teal'}
                      title={u.active ? 'Deactivate account' : 'Activate account'}
                      onClick={() =>
                        setConfirmAction({
                          id: u.id,
                          label: `${u.active ? 'Deactivate' : 'Activate'} ${u.name}'s account?`,
                          action: () => upd.mutate({ id: u.id, s: { active: !u.active } }),
                        })
                      }
                    >
                      {u.active ? <ShieldOff size={13} /> : <Shield size={13} />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Reset password"
                      onClick={() => { setResetUser(u.id); setNewPw('') }}
                    >
                      <Key size={13} />
                    </Button>
                  </div>
                </Td>
              </Tr>
            )
          })}
        </Table>
        <p className="mt-3 text-xs text-muted">{rows.length} of {all.length} accounts</p>
      </Card>

      {/* Create account modal */}
      {createOpen && (
        <Modal title="Create user account" onClose={() => { setCreateOpen(false); cf.reset() }} wide>
          <form
            className="space-y-4"
            onSubmit={cf.handleSubmit((v) =>
              create.mutate(v, { onSuccess: () => { setCreateOpen(false); cf.reset() } })
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" required error={cf.formState.errors.name?.message}>
                <input className={inputCls} {...cf.register('name')} />
              </Field>
              <Field label="Email address" required error={cf.formState.errors.email?.message}>
                <input type="email" className={inputCls} {...cf.register('email')} />
              </Field>
              <Field label="Role" required error={cf.formState.errors.role?.message}>
                <select className={inputCls} {...cf.register('role')}>
                  <option value="">Choose…</option>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </Field>
              <Field label="Password" required error={cf.formState.errors.password?.message} hint="Min 8 chars, 1 uppercase, 1 number">
                <input type="password" autoComplete="new-password" className={inputCls} {...cf.register('password')} />
              </Field>
              <Field label="Staff ID">
                <input className={inputCls} {...cf.register('staffId')} />
              </Field>
              <Field label="Department">
                <input className={inputCls} {...cf.register('department')} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} {...cf.register('phone')} />
              </Field>
            </div>
            <Alert type="info">
              The user will receive a notification once their account is created.
            </Alert>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create account</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit profile modal */}
      {editUser && editing && (
        <Modal title={`Edit: ${editing.name}`} onClose={() => setEditUser(null)}>
          <form
            className="space-y-4"
            onSubmit={ef.handleSubmit((v) =>
              updateProf.mutate({ id: editUser, p: v }, { onSuccess: () => setEditUser(null) })
            )}
          >
            <Field label="Full name" required error={ef.formState.errors.name?.message}>
              <input className={inputCls} {...ef.register('name')} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Staff ID">
                <input className={inputCls} {...ef.register('staffId')} />
              </Field>
              <Field label="Department">
                <input className={inputCls} {...ef.register('department')} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} {...ef.register('phone')} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetUser && (
        <Modal title="Reset password" onClose={() => setResetUser(null)}>
          <Alert type="warning" >
            This sets a new password immediately. Share it securely with the user.
          </Alert>
          <div className="mt-4 space-y-3">
            <Field label="New password" hint="Min 8 characters">
              <input
                type="password"
                autoComplete="new-password"
                className={inputCls}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetUser(null)}>Cancel</Button>
            <Button
              disabled={newPw.length < 8}
              onClick={() =>
                reset.mutate({ id: resetUser, pw: newPw }, { onSuccess: () => setResetUser(null) })
              }
            >
              Reset password
            </Button>
          </div>
        </Modal>
      )}

      {/* Confirm action */}
      {confirmAction && (
        <Confirm
          title={confirmAction.label}
          message="Are you sure you want to proceed?"
          confirmLabel="Confirm"
          onConfirm={confirmAction.action}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
