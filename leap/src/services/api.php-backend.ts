/**
 * Digital LEAP — PHP backend adapter
 * ====================================
 * Drop-in replacement for api.ts.
 * Exports every function with the same name and signature,
 * but calls the PHP REST API instead of localStorage.
 *
 * HOW TO ACTIVATE (see README):
 *   1. Rename this file to api.ts  (keep a backup of the original)
 *   2. Delete (or rename) the original api.ts
 *   3. Ensure VITE_API_URL is set in .env  (or uses the default)
 *
 * IMPORTANT: profileComplete() is a pure helper — it stays identical.
 */

import type {
  Application,
  Assessment,
  GradeConfig,
  Host,
  Logbook,
  Marks,
  Student,
  User,
  Vacancy,
  Visit,
} from '../types'
import { get, post, put, patch } from './http'
export { ApiError } from './http'

// ── Pure helper (no HTTP) — identical to original ─────────────────────────
export const profileComplete = (s: Student): boolean =>
  !!(s.programme && s.semester && s.phone && s.preferredSector && s.regNo)

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<User> {
  return post<User>('/auth/login', { email, password })
}

export async function logout(): Promise<void> {
  await post('/auth/logout')
}

export async function registerStudent(i: {
  name: string
  email: string
  regNo: string
  password: string
}): Promise<void> {
  await post('/auth/register', i)
}

export async function changePassword(current: string, next: string): Promise<void> {
  await post('/auth/change-password', { current, next })
}

export async function requestPasswordReset(email: string): Promise<string> {
  const res = await post<{ message: string }>('/auth/forgot-password', { email })
  return res.message
}

export async function currentUser(): Promise<User | null> {
  return get<User | null>('/auth/me')
}

// ── Users (coordinator) ───────────────────────────────────────────────────

export async function listUsers(): Promise<User[]> {
  return get<User[]>('/users')
}

export async function createUser(i: {
  name: string
  email: string
  role: User['role']
  password: string
  staffId?: string
  department?: string
  phone?: string
  hostId?: string
}): Promise<User> {
  return post<User>('/users', i)
}

export async function setUserState(
  userId: string,
  s: { active?: boolean; unlock?: boolean },
): Promise<User> {
  return patch<User>(`/users/${userId}/state`, s)
}

export async function adminResetPassword(userId: string, newPassword: string): Promise<void> {
  await post(`/users/${userId}/reset-password`, { password: newPassword })
}

export async function updateUserProfile(
  userId: string,
  p: { name?: string; staffId?: string; department?: string; phone?: string },
): Promise<User> {
  return patch<User>(`/users/${userId}/profile`, p)
}

// ── Students ──────────────────────────────────────────────────────────────

export async function myStudent(): Promise<Student> {
  return get<Student>('/students/me')
}

export async function updateProfile(
  p: Pick<Student, 'programme' | 'semester' | 'phone' | 'preferredSector'>,
): Promise<Student> {
  return patch<Student>('/students/me', p)
}

export async function listStudents(): Promise<
  (Student & { complete: boolean; status: string })[]
> {
  return get('/students')
}

export async function verifyStudent(id: string): Promise<void> {
  await post(`/students/${id}/verify`)
}

// ── Hosts & vacancies ─────────────────────────────────────────────────────

export async function listHosts(): Promise<(Host & { vacancies: Vacancy[] })[]> {
  return get('/hosts')
}

export async function addHost(
  h: Pick<Host, 'name' | 'sector' | 'address' | 'contactEmail'> &
    Partial<Pick<Host, 'phone' | 'website' | 'description' | 'contactPerson' | 'type'>>,
): Promise<Host & { vacancies: Vacancy[] }> {
  return post('/hosts', h)
}

export async function updateHost(
  id: string,
  p: Partial<Omit<Host, 'id' | 'verified'>>,
): Promise<Host & { vacancies: Vacancy[] }> {
  return patch(`/hosts/${id}`, p)
}

export async function verifyHost(id: string): Promise<void> {
  await post(`/hosts/${id}/verify`)
}

export async function addVacancy(v: {
  hostId: string
  title: string
  capacity: number
  description?: string
}): Promise<Vacancy> {
  return post('/vacancies', v)
}

export async function updateVacancy(
  id: string,
  p: { title?: string; capacity?: number; open?: boolean; description?: string },
): Promise<Vacancy> {
  return patch(`/vacancies/${id}`, p)
}

export async function listSupervisors(): Promise<
  {
    id: string
    name: string
    email: string
    staffId?: string
    department?: string
    phone?: string
    assignedCount: number
  }[]
> {
  return get('/supervisors')
}

// ── Applications ──────────────────────────────────────────────────────────

export async function listApplications(): Promise<
  (Application & { studentName: string; hostName?: string; supervisorName?: string })[]
> {
  return get('/applications')
}

export async function apply(i: { sector: string; statement: string }): Promise<Application> {
  return post('/applications', i)
}

export async function startReview(id: string): Promise<Application> {
  return post(`/applications/${id}/start-review`)
}

export async function addReviewNote(id: string, notes: string): Promise<Application> {
  return patch(`/applications/${id}/notes`, { notes })
}

export async function approveMatch(
  id: string,
  m: { vacancyId: string; start: string; end: string; supervisorId?: string },
): Promise<Application> {
  return post(`/applications/${id}/match`, m)
}

export async function rejectApplication(id: string, reason: string): Promise<Application> {
  return post(`/applications/${id}/reject`, { reason })
}

export async function withdrawApplication(id: string): Promise<Application> {
  return post(`/applications/${id}/withdraw`)
}

export async function hostRespond(
  id: string,
  accept: boolean,
  reason?: string,
): Promise<Application> {
  return post(`/applications/${id}/respond`, { accept, reason })
}

export async function allocateSupervisor(id: string, supervisorId: string): Promise<Application> {
  return post(`/applications/${id}/supervisor`, { supervisorId })
}

export async function placementLetter(id: string): Promise<string> {
  const res = await get<{ letter: string }>(`/applications/${id}/letter`)
  return res.letter
}

// ── Logbooks ──────────────────────────────────────────────────────────────

export async function listLogbooks(): Promise<(Logbook & { studentName: string })[]> {
  return get('/logbooks')
}

export async function submitLogbook(i: {
  date: string
  activities: string
  skills: string
  hours: number
}): Promise<Logbook> {
  return post('/logbooks', i)
}

export async function reviewLogbook(
  id: string,
  decision: 'Approved' | 'Revision Requested',
  comment: string,
): Promise<Logbook> {
  return post(`/logbooks/${id}/review`, { decision, comment })
}

export async function resubmitLogbook(
  id: string,
  i: { date: string; activities: string; skills: string; hours: number },
): Promise<Logbook> {
  return patch(`/logbooks/${id}/resubmit`, i)
}

// ── Visits ────────────────────────────────────────────────────────────────

export async function listVisits(): Promise<(Visit & { studentName: string; supervisorName: string })[]> {
  return get('/visits')
}

export async function scheduleVisit(
  studentId: string,
  date: string,
  opts?: { visitType?: Visit['visitType']; purpose?: string },
): Promise<Visit> {
  return post('/visits', { studentId, date, ...opts })
}

export async function cancelVisit(id: string): Promise<Visit> {
  return post(`/visits/${id}/cancel`)
}

export async function recordVisitReport(
  id: string,
  r: { observations: string; hostFeedback: string },
): Promise<Visit> {
  return post(`/visits/${id}/report`, r)
}

// ── Assessments ───────────────────────────────────────────────────────────

export async function listAssessments(): Promise<(Assessment & { studentName: string })[]> {
  return get('/assessments')
}

export async function saveMark(
  studentId: string,
  kind: keyof Marks,
  value: number,
  opts: { draft?: boolean; comments?: string } = {},
): Promise<Assessment> {
  return post(`/assessments/${studentId}/mark`, { kind, value, ...opts })
}

export async function compute(studentId: string): Promise<Assessment> {
  return post(`/assessments/${studentId}/compute`)
}

export async function verifyResult(studentId: string): Promise<Assessment> {
  return post(`/assessments/${studentId}/verify`)
}

export async function managementDecision(
  studentId: string,
  decision: 'approve' | 'return' | 'publish',
  reason = '',
): Promise<Assessment> {
  return post(`/assessments/${studentId}/decision`, { decision, reason })
}

// ── Config ────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<GradeConfig> {
  return get('/config')
}

export async function saveConfig(c: GradeConfig): Promise<GradeConfig> {
  return put('/config', c)
}

// ── Notifications ─────────────────────────────────────────────────────────

export async function listNotifications(): Promise<
  { id: string; userId: string; text: string; read: boolean; at: string; link?: string }[]
> {
  return get('/notifications')
}

export async function markRead(id?: string): Promise<void> {
  await post('/notifications/read', id ? { id } : {})
}

// ── Stats ─────────────────────────────────────────────────────────────────

export async function stats(): Promise<{
  students: number
  hosts: number
  vacancies: number
  pending: number
  awaitingHost: number
  confirmed: number
  declined: number
  rejected: number
  completed: number
  logSubmitted: number
  logApproved: number
  logRevision: number
  visitsScheduled: number
  visitsDone: number
  visitsCancelled: number
  awaitingApproval: number
  published: number
  assessmentsOpen: number
  supervisors: number
  activity: { at: string; by: string; action: string }[]
}> {
  return get('/stats')
}
