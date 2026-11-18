import type { Db } from '../types'

/**
 * Local data adapter.
 * The PHP/XAMPP + database backend will replace this file;
 * api.ts is the only consumer, so no page needs to change when that happens.
 * Demo accounts use SHA-256('Demo@12345').
 */
export const DEMO_HASH = '11eecee636899469c8f0db8c75282b38a997496a4bf6a2babc77e4480b6f9bea'

const KEY = 'leap-db-v1'
const SESSION = 'leap-session-v1'
const mem: Record<string, string> = {}

const ls = {
  get: (k: string): string | null => {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : mem[k] ?? null } catch { return mem[k] ?? null }
  },
  set: (k: string, v: string) => {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); else mem[k] = v } catch { mem[k] = v }
  },
  del: (k: string) => {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(k); else delete mem[k] } catch { delete mem[k] }
  },
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function seed(): Db {
  const u = (
    id: string,
    name: string,
    role: Db['users'][number]['role'],
    extras: Partial<Db['users'][number]> = {},
  ): Db['users'][number] => ({
    id,
    name,
    email: `${id}@leap.demo`,
    role,
    passwordHash: DEMO_HASH,
    active: true,
    locked: false,
    failedAttempts: 0,
    createdAt: '2026-09-01',
    lastLogin: '2026-11-01',
    ...extras,
  })

  return {
    users: [
      u('coordinator', 'Mariama Sesay', 'coordinator', {
        staffId: 'STAFF-001', department: 'Internship Office', phone: '+232 76 100 001',
      }),
      u('supervisor', 'Dr. Ibrahim Conteh', 'supervisor', {
        staffId: 'STAFF-010', department: 'Software Engineering', phone: '+232 76 100 010',
      }),
      u('supervisor2', 'Ms. Fatmata Bangura', 'supervisor', {
        staffId: 'STAFF-011', department: 'Business & IT', phone: '+232 76 100 011',
      }),
      u('host', 'James Koroma', 'host', { hostId: 'h1', phone: '+232 76 200 001' }),
      u('host2', 'Hawa Turay', 'host', { hostId: 'h2', phone: '+232 76 200 002' }),
      u('management', 'Prof. Alusine Kargbo', 'management', {
        staffId: 'STAFF-002', department: 'Academic Affairs',
      }),
      u('student1', 'Aminata Kamara', 'student'),
      u('student2', 'Mohamed Jalloh', 'student'),
      u('student3', 'Isatu Koroma', 'student'),
    ],
    students: [
      {
        id: 's1', userId: 'student1', name: 'Aminata Kamara',
        regNo: 'LIM-2024-0101', programme: 'Software Engineering',
        semester: 'Semester 04', phone: '+232 76 000 101',
        preferredSector: 'ICT', verified: true,
      },
      {
        id: 's2', userId: 'student2', name: 'Mohamed Jalloh',
        regNo: 'LIM-2024-0102', programme: 'Business Information Technology',
        semester: 'Semester 04', phone: '', preferredSector: '', verified: false,
      },
      {
        id: 's3', userId: 'student3', name: 'Isatu Koroma',
        regNo: 'LIM-2024-0103', programme: 'Software Engineering',
        semester: 'Semester 05', phone: '+232 76 000 103',
        preferredSector: 'Media', verified: true,
      },
    ],

    hosts: [
      {
        id: 'h1', name: 'Salone Tech Ltd', sector: 'ICT',
        address: 'Wilkinson Road, Freetown', contactEmail: 'hr@salonetech.example',
        verified: true, phone: '+232 22 100 001', website: 'https://salonetech.example',
        contactPerson: 'James Koroma', type: 'Private Company',
        description: 'Leading ICT company providing software development and IT services in Sierra Leone.',
      },
      {
        id: 'h2', name: 'Freetown Media House', sector: 'Media',
        address: 'Siaka Stevens St, Freetown', contactEmail: 'info@ftmedia.example',
        verified: true, phone: '+232 22 100 002', website: 'https://ftmedia.example',
        contactPerson: 'Hawa Turay', type: 'Media Organisation',
        description: 'Premier media company covering news, television and digital content.',
      },
    ],
    vacancies: [
      { id: 'v1', hostId: 'h1', title: 'Software Developer Intern', capacity: 3, filled: 1, open: true, description: 'Work on web and mobile applications using modern JavaScript frameworks.' },
      { id: 'v2', hostId: 'h2', title: 'Video Production Intern', capacity: 2, filled: 0, open: true, description: 'Assist in video production, editing and broadcast operations.' },
      { id: 'v3', hostId: 'h1', title: 'IT Support Intern', capacity: 2, filled: 0, open: true, description: 'Provide technical support and assist with network administration.' },
    ],
    applications: [
      {
        id: 'a1', studentId: 's1', sector: 'ICT',
        statement: 'Interested in web development and software engineering.', status: 'Confirmed',
        createdAt: '2026-10-01', hostId: 'h1', vacancyId: 'v1',
        start: '2026-11-02', end: '2027-02-26', supervisorId: 'supervisor', declineHistory: [],
      },
      {
        id: 'a3', studentId: 's3', sector: 'Media',
        statement: 'Passionate about video production and digital storytelling.', status: 'Pending',
        createdAt: '2026-10-15', declineHistory: [],
      },
    ],
    logbooks: [
      {
        id: 'l1', studentId: 's1', week: 1, date: '2026-11-06',
        activities: 'Set up development environment and reviewed codebase. Attended team onboarding session.',
        skills: 'Git, TypeScript, Node.js', hours: 40, status: 'Submitted',
        submittedAt: '2026-11-07', history: ['Submitted'],
      },
    ],
    visits: [],
    assessments: [],
    notifications: [],
    reports: [],
    config: {
      practical: { logbook: 50, formD: 40, selfEval: 10 },
      other: { report: 75, careerFair: 25 },
      groups: { practical: null, other: null },
      bands: [],
    },
    audit: [
      { at: '2026-11-01T08:00:00Z', by: 'coordinator', action: 'Signed in' },
      { at: '2026-10-20T10:30:00Z', by: 'coordinator', action: 'Added host Salone Tech Ltd' },
      { at: '2026-10-15T14:00:00Z', by: 'student3', action: 'Signed in' },
    ],
  }
}

let cache: Db | null = null
export function db(): Db {
  if (cache) return cache
  const raw = ls.get(KEY)
  cache = raw ? (JSON.parse(raw) as Db) : seed()
  return cache
}
export function save() { if (cache) ls.set(KEY, JSON.stringify(cache)) }
export function resetDb() { cache = seed(); save(); ls.del(SESSION) }
export const sessionStore = {
  get: () => ls.get(SESSION),
  set: (v: string) => ls.set(SESSION, v),
  clear: () => ls.del(SESSION),
}
