import type {
  Application, Assessment, GradeConfig, Host, Logbook, Marks,
  Role, Student, User, Vacancy, Visit,
} from '../types'
import { computeResult, validateConfig } from '../lib/grade'
import { inRange, today } from '../lib/dates'
import { db, save, sessionStore, uid } from './store'

export class ApiError extends Error {
  constructor(public code: 400 | 401 | 403 | 404 | 409, message: string) { super(message) }
}
function fail(c: ApiError['code'], m: string): never { throw new ApiError(c, m) }

async function sha256(t: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
const audit = (by: string, action: string) => {
  db().audit.unshift({ at: new Date().toISOString(), by, action })
}
const notify = (userId: string, text: string, link?: string) => {
  db().notifications.unshift({ id: uid(), userId, text, link, read: false, at: new Date().toISOString() })
}
const notifyRole = (role: Role, text: string, link?: string) =>
  db().users.filter((u) => u.role === role && u.active).forEach((u) => notify(u.id, text, link))

// ---------- session & access helpers ----------
export function currentUser(): User | null {
  const id = sessionStore.get()
  return db().users.find((u) => u.id === id && u.active && !u.locked) ?? null
}
const me = (): User => currentUser() ?? fail(401, 'Please sign in to continue.')
const need = (...roles: Role[]): User => {
  const u = me()
  if (!roles.includes(u.role)) fail(403, 'You do not have permission to do this.')
  return u
}
const studentOf = (u: User) => db().students.find((s) => s.userId === u.id)
const appOf = (studentId: string) =>
  db().applications.find((a) => a.studentId === studentId && !['Rejected', 'Declined', 'Withdrawn'].includes(a.status)) ??
  db().applications.find((a) => a.studentId === studentId)

function visibleStudentIds(u: User): string[] {
  const d = db()
  switch (u.role) {
    case 'coordinator': case 'management': return d.students.map((s) => s.id)
    case 'student': return studentOf(u) ? [studentOf(u)!.id] : []
    case 'supervisor': return d.applications.filter((a) => a.supervisorId === u.id).map((a) => a.studentId)
    case 'host': return d.applications
      .filter((a) => a.hostId === u.hostId && ['Awaiting Host Response', 'Confirmed', 'Completed'].includes(a.status))
      .map((a) => a.studentId)
  }
}
const canSee = (u: User, studentId: string) =>
  visibleStudentIds(u).includes(studentId) || fail(403, "You cannot access this student's records.")

// ---------- authentication ----------
export async function login(email: string, password: string): Promise<User> {
  const user = db().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!user) return fail(401, 'Email or password is incorrect.')
  if (!user.active) return fail(403, 'This account is deactivated. Contact the LEAP Coordinator.')
  if (user.locked)
    return fail(403, 'This account is locked after 3 failed attempts. Contact the LEAP Coordinator to unlock it.')
  if ((await sha256(password)) !== user.passwordHash) {
    user.failedAttempts += 1
    if (user.failedAttempts >= 3) {
      user.locked = true
      audit(user.id, 'Account locked after 3 failed logins')
      save()
      return fail(403, 'Account locked after 3 failed attempts. Contact the LEAP Coordinator.')
    }
    save()
    return fail(401, `Email or password is incorrect. ${3 - user.failedAttempts} attempt(s) left.`)
  }
  user.failedAttempts = 0
  user.lastLogin = new Date().toISOString()
  sessionStore.set(user.id)
  audit(user.id, 'Signed in')
  save()
  return user
}

export function logout() { sessionStore.clear() }

export async function registerStudent(i: { name: string; email: string; regNo: string; password: string }) {
  const d = db()
  if (d.users.some((u) => u.email.toLowerCase() === i.email.toLowerCase()))
    fail(409, 'An account with this email already exists.')
  if (d.students.some((s) => s.regNo === i.regNo))
    fail(409, 'This registration number is already registered.')
  const id = uid()
  d.users.push({
    id, name: i.name, email: i.email, role: 'student',
    passwordHash: await sha256(i.password), active: true, locked: false, failedAttempts: 0,
    createdAt: new Date().toISOString(),
  })
  d.students.push({
    id: uid(), userId: id, name: i.name, regNo: i.regNo,
    programme: '', semester: '', phone: '', preferredSector: '', verified: false,
  })
  notify(id, 'Welcome to Digital LEAP. Complete your profile to apply for a placement.', '/profile')
  notifyRole('coordinator', `New student registered: ${i.name}`, '/students')
  save()
}

export async function changePassword(current: string, next: string) {
  const u = me()
  if ((await sha256(current)) !== u.passwordHash) fail(400, 'Current password is incorrect.')
  u.passwordHash = await sha256(next)
  audit(u.id, 'Changed password')
  save()
}

export async function requestPasswordReset(email: string) {
  const u = db().users.find((x) => x.email.toLowerCase() === email.toLowerCase())
  if (u) notifyRole('coordinator', `Password reset requested by ${u.name}`, '/users')
  save()
  return 'If the account exists, the LEAP Coordinator has been notified to help you reset it.'
}

export function listUsers(): User[] {
  need('coordinator')
  return db().users.map((u) => ({ ...u, passwordHash: '' }))
}

export function setUserState(userId: string, s: { active?: boolean; unlock?: boolean }) {
  const c = need('coordinator')
  const u = db().users.find((x) => x.id === userId) ?? fail(404, 'User not found.')
  if (s.active !== undefined) u.active = s.active
  if (s.unlock) { u.locked = false; u.failedAttempts = 0 }
  audit(c.id, `Updated account ${u.email}`)
  save()
}

export async function createUser(i: {
  name: string; email: string; role: Role; password: string; staffId?: string; department?: string; phone?: string; hostId?: string
}) {
  const c = need('coordinator')
  if (db().users.some((u) => u.email.toLowerCase() === i.email.toLowerCase()))
    fail(409, 'An account with this email already exists.')
  const id = uid()
  db().users.push({
    id, name: i.name, email: i.email, role: i.role,
    passwordHash: await sha256(i.password), active: true, locked: false, failedAttempts: 0,
    createdAt: new Date().toISOString(),
    staffId: i.staffId, department: i.department, phone: i.phone, hostId: i.hostId,
  })
  if (i.role === 'student') {
    db().students.push({
      id: uid(), userId: id, name: i.name, regNo: '', programme: '',
      semester: '', phone: i.phone ?? '', preferredSector: '', verified: false,
    })
  }
  notify(id, `Welcome to Digital LEAP. Your account has been created as ${i.role}.`)
  audit(c.id, `Created ${i.role} account for ${i.name}`)
  save()
}

export async function adminResetPassword(userId: string, newPassword: string) {
  const c = need('coordinator')
  if (newPassword.length < 8) fail(400, 'Password must be at least 8 characters.')
  const u = db().users.find((x) => x.id === userId) ?? fail(404, 'User not found.')
  u.passwordHash = await sha256(newPassword)
  u.locked = false
  u.failedAttempts = 0
  audit(c.id, `Reset password for ${u.email}`)
  save()
}

export function updateUserProfile(userId: string, p: { name?: string; staffId?: string; department?: string; phone?: string }) {
  const c = need('coordinator')
  const u = db().users.find((x) => x.id === userId) ?? fail(404, 'User not found.')
  if (p.name) u.name = p.name
  if (p.staffId !== undefined) u.staffId = p.staffId
  if (p.department !== undefined) u.department = p.department
  if (p.phone !== undefined) u.phone = p.phone
  audit(c.id, `Updated profile for ${u.email}`)
  save()
}

// ---------- students ----------
export const profileComplete = (s: Student) =>
  !!(s.programme && s.semester && s.phone && s.preferredSector && s.regNo)

export function myStudent(): Student {
  return studentOf(need('student')) ?? fail(404, 'Student profile not found.')
}

export function updateProfile(p: Pick<Student, 'programme' | 'semester' | 'phone' | 'preferredSector'>) {
  const s = myStudent()
  Object.assign(s, p)
  save()
  return s
}

export function listStudents(): (Student & { complete: boolean; status: string })[] {
  const u = me()
  const ids = visibleStudentIds(u)
  return db().students
    .filter((s) => ids.includes(s.id))
    .map((s) => ({
      ...s,
      complete: profileComplete(s),
      status: appOf(s.id)?.status ?? 'No application',
    }))
}

export function getStudent(id: string): Student & { complete: boolean; status: string; supervisorName?: string; hostName?: string; application?: Application } {
  const u = me()
  canSee(u, id)
  const s = db().students.find((x) => x.id === id) ?? fail(404, 'Student not found.')
  const app = appOf(id)
  return {
    ...s,
    complete: profileComplete(s),
    status: app?.status ?? 'No application',
    supervisorName: app?.supervisorId ? db().users.find((x) => x.id === app.supervisorId)?.name : undefined,
    hostName: app?.hostId ? db().hosts.find((h) => h.id === app.hostId)?.name : undefined,
    application: app,
  }
}

export function verifyStudent(id: string) {
  const c = need('coordinator')
  const s = db().students.find((x) => x.id === id) ?? fail(404, 'Not found.')
  s.verified = true
  audit(c.id, `Verified ${s.name}`)
  save()
}

// ---------- hosts & vacancies ----------
export function listHosts(): (Host & { vacancies: Vacancy[] })[] {
  const u = need('coordinator', 'management', 'host', 'supervisor', 'student')
  return db().hosts
    .filter((h) => u.role !== 'host' || h.id === u.hostId)
    .map((h) => ({ ...h, vacancies: db().vacancies.filter((v) => v.hostId === h.id) }))
}

export function getHost(id: string): Host & { vacancies: Vacancy[] } {
  const u = me()
  if (u.role === 'host' && u.hostId !== id) fail(403, 'You can only view your own organisation.')
  const h = db().hosts.find((x) => x.id === id) ?? fail(404, 'Organisation not found.')
  return { ...h, vacancies: db().vacancies.filter((v) => v.hostId === h.id) }
}

export function addHost(h: Pick<Host, 'name' | 'sector' | 'address' | 'contactEmail'> & Partial<Pick<Host, 'phone' | 'website' | 'description' | 'contactPerson' | 'type'>>) {
  const c = need('coordinator')
  db().hosts.push({ ...h, id: uid(), verified: false })
  audit(c.id, `Added host ${h.name}`)
  save()
}

export function updateHost(id: string, p: Partial<Omit<Host, 'id' | 'verified'>>) {
  const u = me()
  if (u.role === 'host' && u.hostId !== id) fail(403, 'You can only update your own organisation.')
  if (u.role !== 'coordinator' && u.role !== 'host') fail(403, 'You do not have permission to do this.')
  const h = db().hosts.find((x) => x.id === id) ?? fail(404, 'Organisation not found.')
  Object.assign(h, p)
  audit(u.id, `Updated host ${h.name}`)
  save()
}

export function verifyHost(id: string) {
  const c = need('coordinator')
  const h = db().hosts.find((x) => x.id === id) ?? fail(404, 'Not found.')
  h.verified = true
  audit(c.id, `Verified host ${h.name}`)
  save()
}

export function addVacancy(v: { hostId: string; title: string; capacity: number; description?: string }) {
  const u = need('coordinator', 'host')
  if (u.role === 'host' && u.hostId !== v.hostId) fail(403, 'You can only manage your own organisation.')
  if (!v.title.trim() || !(v.capacity >= 1)) fail(400, 'Vacancy needs a title and a capacity of at least 1.')
  db().vacancies.push({ id: uid(), hostId: v.hostId, title: v.title, capacity: v.capacity, filled: 0, open: true, description: v.description })
  save()
}

export function updateVacancy(id: string, p: { title?: string; capacity?: number; open?: boolean; description?: string }) {
  const u = need('coordinator', 'host')
  const v = db().vacancies.find((x) => x.id === id) ?? fail(404, 'Vacancy not found.')
  if (u.role === 'host' && u.hostId !== db().hosts.find((h) => h.id === v.hostId)?.id)
    fail(403, 'You can only manage your own organisation.')
  if (p.title !== undefined) v.title = p.title
  if (p.capacity !== undefined) v.capacity = p.capacity
  if (p.open !== undefined) v.open = p.open
  if (p.description !== undefined) v.description = p.description
  save()
}

// ---------- placements & applications ----------
export function listApplications(): (Application & { studentName: string; hostName?: string; supervisorName?: string })[] {
  const u = me()
  const ids = visibleStudentIds(u)
  const d = db()
  return d.applications
    .filter((a) => ids.includes(a.studentId) && (u.role !== 'host' || a.hostId === u.hostId))
    .map((a) => ({
      ...a,
      studentName: d.students.find((s) => s.id === a.studentId)?.name ?? '',
      hostName: d.hosts.find((h) => h.id === a.hostId)?.name,
      supervisorName: d.users.find((x) => x.id === a.supervisorId)?.name,
    }))
}

export function apply(i: { sector: string; statement: string }) {
  const s = myStudent()
  if (!profileComplete(s)) fail(400, 'Complete your profile before applying for a placement.')
  if (!i.sector || i.statement.trim().length < 10)
    fail(400, 'Choose a sector and write a short statement (at least 10 characters).')
  const live = db().applications.find(
    (a) => a.studentId === s.id && !['Rejected', 'Declined', 'Withdrawn'].includes(a.status),
  )
  if (live) fail(409, `You already have an application (${live.status}).`)
  const a: Application = {
    id: uid(), studentId: s.id, sector: i.sector, statement: i.statement,
    status: 'Pending', createdAt: today(), declineHistory: [],
  }
  db().applications.push(a)
  notifyRole('coordinator', `Placement application received from ${s.name}`, '/placements')
  save()
  return a
}

const getApp = (id: string) => db().applications.find((a) => a.id === id) ?? fail(404, 'Application not found.')

export function startReview(id: string) {
  need('coordinator')
  const a = getApp(id)
  if (a.status !== 'Pending') fail(409, 'Only pending applications can be reviewed.')
  a.status = 'Under Review'
  save()
}

export function addReviewNote(id: string, notes: string) {
  const c = need('coordinator')
  const a = getApp(id)
  a.reviewNotes = notes
  audit(c.id, `Added review note to application ${id}`)
  save()
}

export function approveMatch(id: string, m: { vacancyId: string; start: string; end: string; supervisorId?: string }) {
  const c = need('coordinator')
  const a = getApp(id)
  const d = db()
  if (!['Pending', 'Under Review', 'Declined'].includes(a.status))
    fail(409, `An application that is ${a.status} cannot be matched.`)
  const v = d.vacancies.find((x) => x.id === m.vacancyId) ?? fail(404, 'Vacancy not found.')
  const h = d.hosts.find((x) => x.id === v.hostId)!
  if (!h.verified) fail(409, 'This host organisation is not verified yet.')
  if (!v.open || v.filled >= v.capacity) fail(409, 'This vacancy is full or closed.')
  if (!m.start || !m.end || m.end <= m.start) fail(400, 'Provide a valid placement start and end date.')
  Object.assign(a, {
    status: 'Awaiting Host Response', hostId: h.id, vacancyId: v.id,
    start: m.start, end: m.end, reason: undefined,
  })
  if (m.supervisorId) a.supervisorId = m.supervisorId
  d.users
    .filter((u) => u.hostId === h.id)
    .forEach((u) =>
      notify(u.id, `New placement request for ${d.students.find((s) => s.id === a.studentId)?.name}`, '/placements'),
    )
  notify(
    d.students.find((s) => s.id === a.studentId)!.userId,
    `Your placement was approved and a request was sent to ${h.name}.`,
    '/placements',
  )
  audit(c.id, `Approved match ${a.id} → ${h.name}`)
  save()
  return a
}

export function rejectApplication(id: string, reason: string) {
  const c = need('coordinator')
  const a = getApp(id)
  if (!reason.trim()) fail(400, 'A reason is required to reject an application.')
  if (!['Pending', 'Under Review'].includes(a.status))
    fail(409, `An application that is ${a.status} cannot be rejected.`)
  a.status = 'Rejected'
  a.reason = reason
  notify(
    db().students.find((s) => s.id === a.studentId)!.userId,
    `Your placement application was rejected: ${reason}`,
    '/placements',
  )
  audit(c.id, `Rejected ${a.id}`)
  save()
}

export function withdrawApplication(id: string) {
  const s = myStudent()
  const a = db().applications.find((x) => x.id === id && x.studentId === s.id) ?? fail(404, 'Application not found.')
  if (!['Pending', 'Under Review'].includes(a.status))
    fail(409, 'Only pending applications can be withdrawn.')
  a.status = 'Withdrawn'
  notifyRole('coordinator', `${s.name} withdrew application ${id}`, '/placements')
  save()
}

export function hostRespond(id: string, accept: boolean, reason?: string) {
  const u = need('host')
  const a = getApp(id)
  const d = db()
  if (a.hostId !== u.hostId) fail(403, 'This request was not sent to your organisation.')
  if (a.status !== 'Awaiting Host Response') fail(409, 'This request has already been answered.')
  const stu = d.students.find((s) => s.id === a.studentId)!
  if (accept) {
    const v = d.vacancies.find((x) => x.id === a.vacancyId)!
    if (v.filled >= v.capacity) fail(409, 'Vacancy capacity reached.')
    v.filled += 1
    a.status = 'Confirmed'
    notify(stu.userId, 'Your placement is confirmed. You can now submit weekly logbooks.', '/placements')
    notifyRole('coordinator', `${stu.name} placement confirmed`, '/placements')
  } else {
    if (!reason?.trim()) fail(400, 'Give a reason for declining.')
    a.declineHistory.push(`${d.hosts.find((h) => h.id === a.hostId)?.name}: ${reason}`)
    Object.assign(a, { status: 'Declined', hostId: undefined, vacancyId: undefined, reason })
    notify(stu.userId, 'The host declined your placement request. The Coordinator will rematch you.', '/placements')
    notifyRole('coordinator', `${stu.name} declined by host — rematch needed`, '/placements')
  }
  audit(u.id, `Host ${accept ? 'accepted' : 'declined'} ${a.id}`)
  save()
}

export function allocateSupervisor(id: string, supervisorId: string) {
  const c = need('coordinator')
  const a = getApp(id)
  if (!db().users.some((u) => u.id === supervisorId && u.role === 'supervisor'))
    fail(404, 'Supervisor not found.')
  a.supervisorId = supervisorId
  notify(supervisorId, 'You were allocated a new intern.', '/students')
  audit(c.id, `Allocated supervisor to ${a.id}`)
  save()
}

export function listSupervisors() {
  need('coordinator', 'management')
  return db().users
    .filter((u) => u.role === 'supervisor' && u.active)
    .map((u) => ({
      id: u.id, name: u.name, email: u.email,
      staffId: u.staffId, department: u.department, phone: u.phone,
      assignedCount: db().applications.filter((a) => a.supervisorId === u.id && a.status === 'Confirmed').length,
    }))
}

export function placementLetter(id: string): string {
  const u = me()
  const a = getApp(id)
  canSee(u, a.studentId)
  if (!['Awaiting Host Response', 'Confirmed', 'Completed'].includes(a.status))
    fail(409, 'No placement letter exists for this application yet.')
  const s = db().students.find((x) => x.id === a.studentId)!
  const h = db().hosts.find((x) => x.id === a.hostId)!
  return `Limkokwing University of Creative Technology, Sierra Leone\nLEAP Internship Office\n\nDate: ${today()}\n\nThe Human Resources Manager\n${h.name}\n${h.address}\n\nRe: Internship placement for ${s.name} (${s.regNo})\n\nWe request that ${s.name}, a ${s.programme} student, be placed with your organisation from ${a.start} to ${a.end}.\n\nYours faithfully,\nLEAP / Internship Coordinator`
}

// ---------- logbooks ----------
export function listLogbooks(): (Logbook & { studentName: string })[] {
  const u = need('student', 'supervisor', 'coordinator', 'host', 'management')
  const ids = visibleStudentIds(u)
  return db().logbooks
    .filter((l) => ids.includes(l.studentId))
    .map((l) => ({ ...l, studentName: db().students.find((s) => s.id === l.studentId)?.name ?? '' }))
    .sort((a, b) => b.week - a.week)
}

function validateLog(
  i: { date: string; activities: string; skills: string; hours: number },
  a: Application | undefined,
) {
  if (!i.date || i.activities.trim().length < 10 || !i.skills.trim())
    fail(400, 'Date, activities (10+ characters) and skills are required.')
  if (!(i.hours > 0 && i.hours <= 60)) fail(400, 'Hours worked must be between 1 and 60.')
  if (!inRange(i.date, a?.start, a?.end))
    fail(400, 'The logbook date must fall within your placement period.')
}

export function submitLogbook(i: { date: string; activities: string; skills: string; hours: number }) {
  const s = myStudent()
  const a = appOf(s.id)
  if (!a || a.status !== 'Confirmed')
    fail(403, 'You can submit logbooks only after your placement is confirmed.')
  validateLog(i, a)
  const week = Math.max(0, ...db().logbooks.filter((l) => l.studentId === s.id).map((l) => l.week)) + 1
  db().logbooks.push({
    id: uid(), studentId: s.id, week, ...i, status: 'Submitted', submittedAt: today(), history: ['Submitted'],
  })
  if (a.supervisorId) notify(a.supervisorId, `${s.name} submitted logbook week ${week}`, '/logbooks')
  save()
}

export function reviewLogbook(id: string, decision: 'Approved' | 'Revision Requested', comment: string) {
  const u = need('supervisor')
  const l = db().logbooks.find((x) => x.id === id) ?? fail(404, 'Logbook not found.')
  canSee(u, l.studentId)
  if (l.status !== 'Submitted') fail(409, 'Only submitted logbooks can be reviewed.')
  if (decision === 'Revision Requested' && !comment.trim())
    fail(400, 'Add a comment explaining what to revise.')
  l.status = decision
  l.comment = comment
  l.history.push(decision)
  notify(
    db().students.find((s) => s.id === l.studentId)!.userId,
    `Logbook week ${l.week}: ${decision}${comment ? ` — ${comment}` : ''}`,
    '/logbooks',
  )
  save()
}

export function resubmitLogbook(id: string, i: { date: string; activities: string; skills: string; hours: number }) {
  const s = myStudent()
  const l = db().logbooks.find((x) => x.id === id && x.studentId === s.id) ?? fail(404, 'Logbook not found.')
  if (l.status !== 'Revision Requested')
    fail(409, 'Only logbooks with a revision request can be resubmitted.')
  validateLog(i, appOf(s.id))
  Object.assign(l, i, { status: 'Submitted', comment: undefined, submittedAt: today() })
  l.history.push('Resubmitted')
  const a = appOf(s.id)
  if (a?.supervisorId) notify(a.supervisorId, `${s.name} resubmitted logbook week ${l.week}`, '/logbooks')
  save()
}

// ---------- visits ----------
export function listVisits(): (Visit & { studentName: string; supervisorName: string })[] {
  const u = need('student', 'supervisor', 'coordinator', 'host', 'management')
  const ids = visibleStudentIds(u)
  const d = db()
  return d.visits
    .filter((v) => ids.includes(v.studentId))
    .map((v) => ({
      ...v,
      studentName: d.students.find((s) => s.id === v.studentId)?.name ?? '',
      supervisorName: d.users.find((x) => x.id === v.supervisorId)?.name ?? '',
    }))
}

export function scheduleVisit(studentId: string, date: string, opts?: { visitType?: Visit['visitType']; purpose?: string }) {
  const u = need('supervisor', 'coordinator')
  const a = appOf(studentId)
  if (u.role === 'supervisor') canSee(u, studentId)
  if (!a || !a.supervisorId) fail(409, 'Allocate an academic supervisor first.')
  if (!date || date < today()) fail(400, 'Choose a visit date that is today or later.')
  db().visits.push({
    id: uid(), studentId, supervisorId: a.supervisorId, date, status: 'Scheduled',
    visitType: opts?.visitType, purpose: opts?.purpose,
  })
  const s = db().students.find((x) => x.id === studentId)!
  notify(s.userId, `Supervisory visit scheduled for ${date}`, '/visits')
  db().users.filter((x) => x.hostId === a.hostId).forEach((x) => notify(x.id, `Supervisory visit scheduled for ${date}`, '/visits'))
  save()
}

export function cancelVisit(id: string) {
  const u = need('supervisor', 'coordinator')
  const v = db().visits.find((x) => x.id === id) ?? fail(404, 'Visit not found.')
  if (u.role === 'supervisor') canSee(u, v.studentId)
  if (v.status !== 'Scheduled') fail(409, 'Only scheduled visits can be cancelled.')
  v.status = 'Cancelled'
  const s = db().students.find((x) => x.id === v.studentId)!
  notify(s.userId, `Supervisory visit on ${v.date} has been cancelled.`, '/visits')
  save()
}

export function recordVisitReport(id: string, r: { observations: string; hostFeedback: string }) {
  const u = need('supervisor')
  const v = db().visits.find((x) => x.id === id) ?? fail(404, 'Visit not found.')
  canSee(u, v.studentId)
  if (!r.observations.trim()) fail(400, "Record your observations of the student's progress.")
  Object.assign(v, r, { status: 'Completed' })
  notifyRole('coordinator', 'A supervisory visit report was recorded.', '/visits')
  save()
}

// ---------- assessment & results ----------
const emptyMarks = (): Marks => ({ logbook: null, formD: null, selfEval: null, report: null, careerFair: null })

function asmt(studentId: string): Assessment {
  const d = db()
  let a = d.assessments.find((x) => x.studentId === studentId)
  if (!a) {
    a = { studentId, marks: emptyMarks(), formDDraft: false, formDComments: '', status: 'In Progress', history: [] }
    d.assessments.push(a)
  }
  return a
}

const mark = (n: number) => {
  if (!Number.isFinite(n) || n < 0 || n > 100) fail(400, 'Marks must be between 0 and 100.')
  return n
}
const editable = (a: Assessment) => {
  if (['Awaiting Approval', 'Approved', 'Published'].includes(a.status))
    fail(409, 'Results are locked for approval.')
}

export function listAssessments(): (Assessment & { studentName: string })[] {
  const u = me()
  const ids = visibleStudentIds(u)
  const d = db()
  const rows = d.students
    .filter((s) => ids.includes(s.id) && ['Confirmed', 'Completed'].includes(appOf(s.id)?.status ?? ''))
    .map((s) => ({ ...asmt(s.id), studentName: s.name }))
  if (u.role === 'student')
    return rows.map((r) =>
      r.status === 'Published' ? r : { ...r, practical: undefined, other: undefined, overall: undefined, grade: undefined },
    )
  if (u.role === 'management')
    return rows.filter((r) => ['Awaiting Approval', 'Approved', 'Published', 'Returned'].includes(r.status))
  return rows
}

export function saveMark(
  studentId: string,
  kind: keyof Marks,
  value: number,
  opts: { draft?: boolean; comments?: string } = {},
) {
  const u = me()
  canSee(u, studentId)
  const a = asmt(studentId)
  editable(a)
  const allowed: Record<keyof Marks, Role> = {
    logbook: 'supervisor', report: 'supervisor', formD: 'host', selfEval: 'student', careerFair: 'coordinator',
  }
  if (u.role !== allowed[kind]) fail(403, `Only the ${allowed[kind]} can record the ${kind} mark.`)
  a.marks[kind] = mark(value)
  if (kind === 'formD') { a.formDDraft = !!opts.draft; a.formDComments = opts.comments ?? '' }
  a.history.push(`${u.name} recorded ${kind}${opts.draft ? ' (draft)' : ''}`)
  if (a.status === 'Returned' || a.status === 'Computed') a.status = 'In Progress'
  save()
}

export function compute(studentId: string) {
  const c = need('coordinator')
  const a = asmt(studentId)
  editable(a)
  if (a.formDDraft) fail(409, 'The host evaluation (Form D) is still a draft.')
  const r = computeResult(a.marks, db().config)
  if (!r.ok) fail(400, r.errors.join(' '))
  Object.assign(a, { practical: r.practical, other: r.other, overall: r.overall, grade: r.grade, status: 'Computed' })
  a.history.push(`${c.name} computed result`)
  save()
}

export function verifyResult(studentId: string) {
  const c = need('coordinator')
  const a = asmt(studentId)
  if (a.status !== 'Computed') fail(409, 'Compute the result before verifying it.')
  a.status = 'Awaiting Approval'
  a.history.push(`${c.name} verified and sent for approval`)
  notifyRole('management', 'Results are awaiting your approval.', '/assessments')
  save()
}

export function managementDecision(
  studentId: string,
  decision: 'approve' | 'return' | 'publish',
  reason = '',
) {
  const m = need('management')
  const a = asmt(studentId)
  const stu = db().students.find((s) => s.id === studentId)!
  if (decision === 'approve') {
    if (a.status !== 'Awaiting Approval') fail(409, 'Only verified results can be approved.')
    a.status = 'Approved'
  } else if (decision === 'return') {
    if (a.status !== 'Awaiting Approval') fail(409, 'Only results awaiting approval can be returned.')
    if (!reason.trim()) fail(400, 'Give a reason for returning the result.')
    a.status = 'Returned'
    a.returnReason = reason
    notifyRole('coordinator', `Result for ${stu.name} returned: ${reason}`, '/assessments')
  } else {
    if (a.status !== 'Approved') fail(409, 'Approve the result before publishing it.')
    a.status = 'Published'
    notify(stu.userId, 'Your internship result has been published.', '/assessments')
    const ap = appOf(studentId)
    if (ap) ap.status = 'Completed'
  }
  a.history.push(`${m.name}: ${decision}`)
  audit(m.id, `Result ${decision} for ${stu.name}`)
  save()
}

// ---------- configuration ----------
export function getConfig(): GradeConfig {
  need('coordinator', 'management')
  return structuredClone(db().config)
}

export function saveConfig(c: GradeConfig) {
  const u = need('coordinator')
  const errs = validateConfig(c)
  if (errs.length) fail(400, errs.join(' '))
  db().config = c
  audit(u.id, 'Updated grade configuration')
  save()
}

// ---------- notifications, stats ----------
export function listNotifications() {
  const u = me()
  return db().notifications.filter((n) => n.userId === u.id)
}

export function markRead(id?: string) {
  const u = me()
  db().notifications
    .filter((n) => n.userId === u.id && (!id || n.id === id))
    .forEach((n) => (n.read = true))
  save()
}

export function stats() {
  need('coordinator', 'management')
  const d = db()
  const apps = d.applications
  const by = (s: Application['status']) => apps.filter((a) => a.status === s).length
  const logs = d.logbooks
  return {
    students: d.students.length,
    hosts: d.hosts.length,
    vacancies: d.vacancies.reduce((n, v) => n + Math.max(0, v.capacity - v.filled), 0),
    pending: by('Pending') + by('Under Review'),
    awaitingHost: by('Awaiting Host Response'),
    confirmed: by('Confirmed'),
    declined: by('Declined'),
    rejected: by('Rejected'),
    completed: by('Completed'),
    logSubmitted: logs.filter((l) => l.status === 'Submitted').length,
    logApproved: logs.filter((l) => l.status === 'Approved').length,
    logRevision: logs.filter((l) => l.status === 'Revision Requested').length,
    visitsScheduled: d.visits.filter((v) => v.status === 'Scheduled').length,
    visitsDone: d.visits.filter((v) => v.status === 'Completed').length,
    visitsCancelled: d.visits.filter((v) => v.status === 'Cancelled').length,
    awaitingApproval: d.assessments.filter((a) => a.status === 'Awaiting Approval').length,
    published: d.assessments.filter((a) => a.status === 'Published').length,
    assessmentsOpen: d.assessments.filter((a) => ['In Progress', 'Returned'].includes(a.status)).length,
    supervisors: d.users.filter((u) => u.role === 'supervisor' && u.active).length,
    activity: d.audit.slice(0, 10),
  }
}


// ---------- reports ----------
import type { Report } from '../types'

export function listReports(): (Report & { studentName: string })[] {
  const u = me()
  const ids = visibleStudentIds(u)
  return db().reports
    .filter((r) => ids.includes(r.studentId))
    .map((r) => ({ ...r, studentName: db().students.find((s) => s.id === r.studentId)?.name ?? '' }))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

export function submitReport(i: { title: string; content: string }) {
  const s = myStudent()
  if (!i.title.trim() || i.content.trim().length < 50)
    fail(400, 'Enter a report title and content (at least 50 characters).')
  const a = appOf(s.id)
  if (!a || !['Confirmed', 'Completed'].includes(a.status))
    fail(403, 'You can submit reports only after your placement is confirmed.')
  const r: Report = {
    id: uid(), studentId: s.id, title: i.title, content: i.content,
    status: 'Submitted', submittedAt: today(),
  }
  db().reports.push(r)
  if (a.supervisorId) notify(a.supervisorId, `${s.name} submitted a report: ${i.title}`, '/my-reports')
  save()
  return r
}

export function reviewReport(id: string, approved: boolean, feedback: string) {
  const u = need('supervisor', 'coordinator')
  const r = db().reports.find((x) => x.id === id) ?? fail(404, 'Report not found.')
  canSee(u, r.studentId)
  if (r.status !== 'Submitted') fail(409, 'Only submitted reports can be reviewed.')
  r.status = approved ? 'Approved' : 'Reviewed'
  r.feedback = feedback
  r.reviewedBy = u.id
  r.reviewedAt = new Date().toISOString()
  notify(db().students.find((s) => s.id === r.studentId)!.userId, `Your report "${r.title}" was ${approved ? 'approved' : 'reviewed with feedback'}.`, '/my-reports')
  save()
}
