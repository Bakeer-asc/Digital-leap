// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import * as api from '../src/services/api'
import { resetDb, db } from '../src/services/store'
import { computeResult, validateConfig } from '../src/lib/grade'
import type { GradeConfig } from '../src/types'

const PW = 'Demo@12345'
const as = (u: string) => api.login(`${u}@leap.demo`, PW)
const rejects = async (p: unknown, code?: number) => { try { await (typeof p === 'function' ? (p as () => unknown)() : p); } catch (e) { if (code) expect((e as api.ApiError).code).toBe(code); return } throw new Error('expected failure') }
const goodConfig = (): GradeConfig => ({ practical: { logbook: 50, formD: 40, selfEval: 10 }, other: { report: 75, careerFair: 25 }, groups: { practical: 50, other: 50 }, bands: [{ grade: 'A', min: 70, max: 100 }, { grade: 'B', min: 50, max: 69.99 }, { grade: 'F', min: 0, max: 49.99 }] })
beforeEach(() => resetDb())

describe('AUTH', () => {
  it('T01 valid login', async () => { expect((await as('coordinator')).role).toBe('coordinator') })
  it('T02 invalid login shows remaining attempts', async () => { await rejects(api.login('student1@leap.demo', 'wrong'), 401) })
  it('T03 three failed logins lock the account, even with the right password afterwards', async () => {
    for (let i = 0; i < 3; i++) await rejects(api.login('student1@leap.demo', 'bad'))
    await rejects(as('student1'), 403); expect(db().users.find((u) => u.id === 'student1')!.locked).toBe(true)
  })
  it('T04 coordinator can unlock', async () => {
    for (let i = 0; i < 3; i++) await rejects(api.login('student1@leap.demo', 'bad'))
    await as('coordinator'); api.setUserState('student1', { unlock: true }); api.logout(); expect((await as('student1')).role).toBe('student')
  })
  it('T05 unauthenticated calls are rejected', () => { api.logout(); expect(() => api.listStudents()).toThrow(); expect(() => api.stats()).toThrow() })
  it('T06 deactivated account cannot sign in', async () => { await as('coordinator'); api.setUserState('student2', { active: false }); api.logout(); await rejects(as('student2'), 403) })
  it('T07 registration rejects duplicate email and stores a hash, not the password', async () => {
    await api.registerStudent({ name: 'New Student', email: 'new@leap.demo', regNo: 'LIM-9', password: 'Strong1pass' })
    await rejects(api.registerStudent({ name: 'X', email: 'new@leap.demo', regNo: 'LIM-10', password: 'Strong1pass' }), 409)
    const u = db().users.find((x) => x.email === 'new@leap.demo')!; expect(u.passwordHash).not.toContain('Strong1pass'); expect(u.passwordHash).toHaveLength(64)
  })
  it('T08 password change requires current password', async () => { await as('student1'); await rejects(api.changePassword('nope', 'Newpass123'), 400); await api.changePassword(PW, 'Newpass123'); api.logout(); await api.login('student1@leap.demo', 'Newpass123') })
})

describe('PLACEMENT', () => {
  it('T10 incomplete profile cannot apply', async () => { await as('student2'); expect(() => api.apply({ sector: 'ICT', statement: 'I want to learn.' })).toThrow(/profile/i) })
  it('T11 complete application is stored as Pending', async () => {
    await as('student2'); api.updateProfile({ programme: 'SE', semester: 'Semester 04', phone: '076', preferredSector: 'Media' })
    expect(api.apply({ sector: 'Media', statement: 'I love video work.' }).status).toBe('Pending')
  })
  async function pending() { await as('student2'); api.updateProfile({ programme: 'SE', semester: 'Semester 04', phone: '076', preferredSector: 'Media' }); const a = api.apply({ sector: 'Media', statement: 'I love video work.' }); api.logout(); return a }
  it('T12 duplicate live application blocked', async () => { await pending(); await as('student2'); expect(() => api.apply({ sector: 'ICT', statement: 'Another one here.' })).toThrow(/already/) })
  it('T13 coordinator approves match → awaiting host, generates letter', async () => {
    const a = await pending(); await as('coordinator'); api.approveMatch(a.id, { vacancyId: 'v2', start: '2026-11-16', end: '2027-02-26', supervisorId: 'supervisor2' })
    api.logout(); await as('student2'); const row = api.listApplications()[0]; expect(row.status).toBe('Awaiting Host Response'); expect(api.placementLetter(row.id)).toContain('Freetown Media House')
  })
  it('T14 coordinator rejection requires a reason', async () => { const a = await pending(); await as('coordinator'); expect(() => api.rejectApplication(a.id, ' ')).toThrow(); api.rejectApplication(a.id, 'No vacancy in sector'); expect(db().applications.find((x) => x.id === a.id)!.status).toBe('Rejected') })
  it('T15 host accepts → Confirmed, capacity used', async () => {
    const a = await pending(); await as('coordinator'); api.approveMatch(a.id, { vacancyId: 'v2', start: '2026-11-16', end: '2027-02-26' }); api.logout()
    await as('host2'); api.hostRespond(a.id, true); expect(db().applications.find((x) => x.id === a.id)!.status).toBe('Confirmed'); expect(db().vacancies.find((v) => v.id === 'v2')!.filled).toBe(1)
  })
  it('T16 host decline needs reason, then Coordinator rematches', async () => {
    const a = await pending(); await as('coordinator'); api.approveMatch(a.id, { vacancyId: 'v2', start: '2026-11-16', end: '2027-02-26' }); api.logout()
    await as('host2'); expect(() => api.hostRespond(a.id, false)).toThrow(); api.hostRespond(a.id, false, 'No capacity'); api.logout()
    expect(db().applications.find((x) => x.id === a.id)!.status).toBe('Declined')
    await as('coordinator'); api.approveMatch(a.id, { vacancyId: 'v1', start: '2026-11-16', end: '2027-02-26' }); expect(db().applications.find((x) => x.id === a.id)!.status).toBe('Awaiting Host Response')
  })
  it('T17 unverified host or full vacancy cannot be matched', async () => {
    const a = await pending(); await as('coordinator'); db().vacancies.find((v) => v.id === 'v2')!.filled = 2
    expect(() => api.approveMatch(a.id, { vacancyId: 'v2', start: '2026-11-16', end: '2027-02-26' })).toThrow(/full/)
    db().hosts.find((h) => h.id === 'h1')!.verified = false; expect(() => api.approveMatch(a.id, { vacancyId: 'v1', start: '2026-11-16', end: '2027-02-26' })).toThrow(/verified/)
  })
  it('T18 only the addressed host can answer', async () => {
    const a = await pending(); await as('coordinator'); api.approveMatch(a.id, { vacancyId: 'v2', start: '2026-11-16', end: '2027-02-26' }); api.logout(); await as('host'); expect(() => api.hostRespond(a.id, true)).toThrow(/organisation/)
  })
})

describe('LOGBOOK', () => {
  const entry = { date: '2026-11-10', activities: 'Built a login page component.', skills: 'React', hours: 38 }
  it('T20 valid submission by confirmed student', async () => { await as('student1'); api.submitLogbook(entry); expect(api.listLogbooks().some((l) => l.week === 2)).toBe(true) })
  it('T21 missing required fields rejected', async () => { await as('student1'); expect(() => api.submitLogbook({ ...entry, skills: '' })).toThrow(); expect(() => api.submitLogbook({ ...entry, activities: 'short' })).toThrow() })
  it('T22 date outside placement period rejected', async () => { await as('student1'); expect(() => api.submitLogbook({ ...entry, date: '2026-10-01' })).toThrow(/placement period/); expect(() => api.submitLogbook({ ...entry, date: '2027-03-15' })).toThrow(/placement period/) })
  it('T23 student without confirmed placement cannot submit', async () => { await as('student2'); expect(() => api.submitLogbook(entry)).toThrow(/confirmed/) })
  it('T24 supervisor approves', async () => { await as('supervisor'); api.reviewLogbook('l1', 'Approved', ''); expect(db().logbooks[0].status).toBe('Approved') })
  it('T25 revision needs a comment; student resubmits', async () => {
    await as('supervisor'); expect(() => api.reviewLogbook('l1', 'Revision Requested', '')).toThrow(); api.reviewLogbook('l1', 'Revision Requested', 'Add more detail'); api.logout()
    await as('student1'); expect(api.listNotifications()[0].text).toContain('Add more detail'); api.resubmitLogbook('l1', { ...entry, date: '2026-11-06' }); expect(db().logbooks[0].status).toBe('Submitted')
  })
  it('T26 unassigned supervisor cannot review', async () => { await as('supervisor2'); expect(() => api.reviewLogbook('l1', 'Approved', '')).toThrow(/cannot access/) })
})

describe('ASSESSMENT', () => {
  const marks = async () => {
    await as('supervisor'); api.saveMark('s1', 'logbook', 80); api.saveMark('s1', 'report', 70); api.logout()
    await as('host'); api.saveMark('s1', 'formD', 75); api.logout(); await as('student1'); api.saveMark('s1', 'selfEval', 90); api.logout(); await as('coordinator'); api.saveMark('s1', 'careerFair', 60)
  }
  it('T30 grade math (50/40/10, 75/25, groups 50/50)', () => { const r = computeResult({ logbook: 80, formD: 75, selfEval: 90, report: 70, careerFair: 60 }, goodConfig()); expect(r.practical).toBe(79); expect(r.other).toBe(67.5); expect(r.overall).toBe(73.25); expect(r.grade).toBe('A') })
  it('T31 missing components blocks computation', () => { const r = computeResult({ logbook: 80, formD: null, selfEval: 90, report: 70, careerFair: 60 }, goodConfig()); expect(r.ok).toBe(false); expect(r.errors.join()).toContain('formD') })
  it('T32 invalid configurations flagged', () => {
    const c = goodConfig(); c.practical.logbook = 60; expect(validateConfig(c).length).toBeGreaterThan(0)
    const d = goodConfig(); d.groups = { practical: 60, other: 60 }; expect(validateConfig(d).join()).toContain('Group weights')
    const e = goodConfig(); e.bands.push({ grade: 'X', min: 60, max: 75 }); expect(validateConfig(e).join()).toContain('overlaps')
  })
  it('T33 no invented grading: default config cannot compute', async () => { await marks(); expect(() => api.compute('s1')).toThrow(/not configured/) })
  it('T34 only the right role can enter each mark', async () => { await as('student1'); expect(() => api.saveMark('s1', 'logbook', 90)).toThrow(/supervisor/); await api.logout(); await as('host'); expect(() => api.saveMark('s1', 'selfEval', 90)).toThrow() })
  it('T35 marks outside 0–100 rejected', async () => { await as('supervisor'); expect(() => api.saveMark('s1', 'logbook', 101)).toThrow(); expect(() => api.saveMark('s1', 'logbook', -1)).toThrow() })
  it('T36 Form D draft blocks computation', async () => { await as('host'); api.saveMark('s1', 'formD', 70, { draft: true }); api.logout(); await as('coordinator'); api.saveConfig(goodConfig()); expect(() => api.compute('s1')).toThrow(/draft|Missing/) })
  it('T37 full workflow: compute → verify → management approve → publish → student sees result', async () => {
    await marks(); api.saveConfig(goodConfig()); api.compute('s1'); expect(() => api.managementDecision('s1', 'approve')).toThrow(); api.verifyResult('s1'); api.logout()
    await as('management'); expect(() => api.managementDecision('s1', 'publish')).toThrow(); api.managementDecision('s1', 'approve'); api.managementDecision('s1', 'publish'); api.logout()
    await as('student1'); const r = api.listAssessments()[0]; expect(r.status).toBe('Published'); expect(r.grade).toBe('A')
  })
  it('T38 student cannot see computed grade before publication', async () => { await marks(); api.saveConfig(goodConfig()); api.compute('s1'); api.logout(); await as('student1'); expect(api.listAssessments()[0].grade).toBeUndefined() })
  it('T39 coordinator cannot approve or publish; management can return with reason', async () => {
    await marks(); api.saveConfig(goodConfig()); api.compute('s1'); api.verifyResult('s1'); expect(() => api.managementDecision('s1', 'approve')).toThrow(/permission/); api.logout()
    await as('management'); expect(() => api.managementDecision('s1', 'return', '')).toThrow(); api.managementDecision('s1', 'return', 'Recheck report mark'); expect(db().assessments[0].status).toBe('Returned')
  })
  it('T40 results are locked while awaiting approval', async () => { await marks(); api.saveConfig(goodConfig()); api.compute('s1'); api.verifyResult('s1'); api.logout(); await as('supervisor'); expect(() => api.saveMark('s1', 'logbook', 10)).toThrow(/locked/) })
  it('T41 invalid grade config cannot be saved', async () => { await as('coordinator'); const c = goodConfig(); c.other.report = 10; expect(() => api.saveConfig(c)).toThrow() })
})

describe('ACCESS CONTROL', () => {
  it('T50 student sees only own record', async () => { await as('student1'); expect(api.listStudents().map((s) => s.id)).toEqual(['s1']); expect(() => api.stats()).toThrow(/permission/); expect(() => api.listUsers()).toThrow() })
  it('T51 supervisor sees only assigned students', async () => { await as('supervisor2'); expect(api.listStudents()).toHaveLength(0); expect(api.listLogbooks()).toHaveLength(0); await api.logout(); await as('supervisor'); expect(api.listStudents()).toHaveLength(1) })
  it('T52 host sees only own organisation', async () => { await as('host2'); expect(api.listHosts().map((h) => h.id)).toEqual(['h2']); expect(api.listStudents()).toHaveLength(0); expect(() => api.addVacancy({ hostId: 'h1', title: 'X', capacity: 1 })).toThrow() })
  it('T53 host sees intern of own org only', async () => { await as('host'); expect(api.listStudents().map((s) => s.id)).toEqual(['s1']) })
  it('T54 student cannot read another student’s letter', async () => { await as('student2'); expect(() => api.placementLetter('a1')).toThrow(/cannot access/) })
  it('T55 coordinator cannot perform management actions or host responses', async () => { await as('coordinator'); expect(() => api.managementDecision('s1', 'approve')).toThrow(); expect(() => api.hostRespond('a1', true)).toThrow() })
  it('T56 management cannot change grade settings or review placements', async () => { await as('management'); expect(() => api.saveConfig(goodConfig())).toThrow(); expect(() => api.startReview('a1')).toThrow() })
  it('T57 visits: schedule needs allocated supervisor; report by assigned supervisor only', async () => {
    await as('supervisor'); api.scheduleVisit('s1', '2026-12-01'); const id = db().visits[0].id; api.logout()
    await as('supervisor2'); expect(() => api.recordVisitReport(id, { observations: 'x', hostFeedback: '' })).toThrow(); api.logout()
    await as('supervisor'); expect(() => api.recordVisitReport(id, { observations: '', hostFeedback: '' })).toThrow(); api.recordVisitReport(id, { observations: 'Good progress', hostFeedback: 'Happy' }); expect(db().visits[0].status).toBe('Completed')
  })
})
