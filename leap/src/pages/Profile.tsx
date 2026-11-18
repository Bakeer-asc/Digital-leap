import { z } from 'zod'
import { useZodForm } from '../lib/form'
import { Alert, Button, Card, ErrorBox, Field, Loading, PageHeader, SectionTitle, inputCls } from '../components/ui'
import { useAction, useApi } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { changePassword, myStudent, profileComplete, updateProfile } from '../services/api'
import { SECTORS } from '../lib/constants'
import { ROLE_LABEL } from '../layouts/AppLayout'
import { CheckCircle } from 'lucide-react'

const profileSchema = z.object({
  programme: z.string().min(2, 'Enter your programme.'),
  semester: z.string().min(1, 'Choose a semester.'),
  phone: z.string().min(7, 'Enter a phone number.'),
  preferredSector: z.string().min(1, 'Choose a sector.'),
})

export default function Profile() {
  const { user } = useAuth()
  const q = useApi('myStudent', myStudent)

  if (!user) return null

  // Non-student users see a simplified profile
  if (user.role !== 'student') {
    return (
      <div className="space-y-5">
        <PageHeader title="My Profile" description="Your account information." />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Account details">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-navy text-lg font-bold text-white">
                  {user.name[0]}
                </span>
                <div>
                  <p className="font-semibold text-ink">{user.name}</p>
                  <p className="text-sm text-muted">{ROLE_LABEL[user.role]}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Email</p><p className="mt-1">{user.email}</p></div>
                {user.staffId && <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Staff ID</p><p className="mt-1">{user.staffId}</p></div>}
                {user.department && <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Department</p><p className="mt-1">{user.department}</p></div>}
                {user.phone && <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Phone</p><p className="mt-1">{user.phone}</p></div>}
              </div>
            </div>
          </Card>
          <PasswordCard />
        </div>
      </div>
    )
  }

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  return <StudentProfilePage student={q.data!} userEmail={user.email} />
}

function StudentProfilePage({
  student,
  userEmail,
}: {
  student: {
    id: string; userId: string; name: string; regNo: string; programme: string
    semester: string; phone: string; preferredSector: string; verified: boolean
  }
  userEmail: string
}) {
  const save = useAction(updateProfile, 'Profile saved')
  const f = useZodForm(profileSchema, {
    programme: student.programme,
    semester: student.semester,
    phone: student.phone,
    preferredSector: student.preferredSector,
  })
  const e = f.formState.errors
  const complete = profileComplete(student)

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Profile"
        description="Keep your profile up to date to apply for placements."
      />

      {!complete && (
        <Alert type="warning">
          Your profile is incomplete. Complete all required fields before you can apply for a placement.
        </Alert>
      )}

      {complete && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-ok">
          <CheckCircle size={16} />
          <span>Profile complete — you can apply for a placement.</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Student profile">
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy text-lg font-bold text-white">
                {student.name[0]}
              </span>
              <div>
                <p className="font-semibold text-ink">{student.name}</p>
                <p className="text-sm text-muted">{student.regNo} · {userEmail}</p>
              </div>
            </div>
          </div>

          <form className="space-y-4" onSubmit={f.handleSubmit((v) => save.mutate(v))}>
            <SectionTitle>Academic Information</SectionTitle>
            <Field label="Programme / Course" required error={e.programme?.message}>
              <input className={inputCls} {...f.register('programme')} />
            </Field>
            <Field label="Semester" required error={e.semester?.message}>
              <select className={inputCls} {...f.register('semester')}>
                <option value="">Choose…</option>
                {['Semester 03', 'Semester 04', 'Semester 05', 'Semester 06'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <SectionTitle>Contact Information</SectionTitle>
            <Field label="Phone number" required error={e.phone?.message}>
              <input type="tel" className={inputCls} {...f.register('phone')} />
            </Field>
            <SectionTitle>Internship Preference</SectionTitle>
            <Field label="Preferred sector" required error={e.preferredSector?.message}>
              <select className={inputCls} {...f.register('preferredSector')}>
                <option value="">Choose…</option>
                {SECTORS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Button type="submit" disabled={save.isPending}>
              Save profile
            </Button>
          </form>
        </Card>

        <PasswordCard />
      </div>
    </div>
  )
}

function PasswordCard() {
  const save = useAction(
    ({ cur, next }: { cur: string; next: string }) => changePassword(cur, next),
    'Password changed successfully',
  )
  const f = useZodForm(
    z.object({
      cur: z.string().min(1, 'Enter your current password.'),
      next: z
        .string()
        .min(8, 'Use at least 8 characters.')
        .regex(/[A-Z]/, 'Include at least one uppercase letter.')
        .regex(/[0-9]/, 'Include at least one number.'),
    }),
  )
  return (
    <Card title="Change password">
      <form
        className="space-y-4"
        onSubmit={f.handleSubmit((v) => save.mutate(v, { onSuccess: () => f.reset() }))}
      >
        <Field label="Current password" required error={f.formState.errors.cur?.message}>
          <input className={inputCls} type="password" autoComplete="current-password" {...f.register('cur')} />
        </Field>
        <Field
          label="New password"
          required
          error={f.formState.errors.next?.message}
          hint="At least 8 characters, one uppercase letter and one number."
        >
          <input className={inputCls} type="password" autoComplete="new-password" {...f.register('next')} />
        </Field>
        <Button type="submit" disabled={save.isPending}>
          Change password
        </Button>
      </form>
    </Card>
  )
}
