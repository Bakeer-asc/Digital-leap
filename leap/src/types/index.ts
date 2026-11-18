export type Role = 'student' | 'coordinator' | 'supervisor' | 'host' | 'management'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  passwordHash: string
  active: boolean
  locked: boolean
  failedAttempts: number
  hostId?: string
  /** ISO date of account creation */
  createdAt?: string
  /** ISO date of last successful login */
  lastLogin?: string
  /** Optional staff/employee ID (supervisors, coordinators) */
  staffId?: string
  /** Department (supervisors, coordinators) */
  department?: string
  /** Phone number */
  phone?: string
}

export interface Student {
  id: string
  userId: string
  name: string
  regNo: string
  programme: string
  semester: string
  phone: string
  preferredSector: string
  verified: boolean
}

export interface Host {
  id: string
  name: string
  sector: string
  address: string
  contactEmail: string
  verified: boolean
  /** Additional optional fields */
  phone?: string
  website?: string
  description?: string
  contactPerson?: string
  type?: string
  logoUrl?: string
}

export interface Vacancy {
  id: string
  hostId: string
  title: string
  capacity: number
  filled: number
  open: boolean
  /** Optional description of the vacancy */
  description?: string
}

export type AppStatus =
  | 'Draft'
  | 'Pending'
  | 'Under Review'
  | 'Awaiting Host Response'
  | 'Confirmed'
  | 'Declined'
  | 'Rejected'
  | 'Withdrawn'
  | 'Completed'

export interface Application {
  id: string
  studentId: string
  sector: string
  statement: string
  status: AppStatus
  createdAt: string
  hostId?: string
  vacancyId?: string
  start?: string
  end?: string
  supervisorId?: string
  reason?: string
  declineHistory: string[]
  /** Review comments from coordinator */
  reviewNotes?: string
}

export type LogStatus = 'Submitted' | 'Approved' | 'Revision Requested'

export interface Logbook {
  id: string
  studentId: string
  week: number
  date: string
  activities: string
  skills: string
  hours: number
  status: LogStatus
  comment?: string
  submittedAt: string
  history: string[]
}

export interface Visit {
  id: string
  studentId: string
  supervisorId: string
  date: string
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  observations?: string
  hostFeedback?: string
  /** Type of visit */
  visitType?: 'On-site' | 'Virtual' | 'Phone'
  /** Purpose/agenda */
  purpose?: string
}

export type ResultStatus =
  | 'In Progress'
  | 'Computed'
  | 'Awaiting Approval'
  | 'Returned'
  | 'Approved'
  | 'Published'

export interface Marks {
  logbook: number | null
  formD: number | null
  selfEval: number | null
  report: number | null
  careerFair: number | null
}

export interface Assessment {
  studentId: string
  marks: Marks
  formDDraft: boolean
  formDComments: string
  status: ResultStatus
  practical?: number
  other?: number
  overall?: number
  grade?: string
  returnReason?: string
  history: string[]
}

export interface GradeBand {
  grade: string
  min: number
  max: number
}

export interface GradeConfig {
  practical: { logbook: number; formD: number; selfEval: number }
  other: { report: number; careerFair: number }
  groups: { practical: number | null; other: number | null }
  bands: GradeBand[]
}

export interface Notification {
  id: string
  userId: string
  text: string
  read: boolean
  at: string
  link?: string
  /** Category for filtering */
  category?: 'placement' | 'logbook' | 'visit' | 'assessment' | 'general'
}

export interface Report {
  id: string
  studentId: string
  title: string
  content: string
  status: 'Draft' | 'Submitted' | 'Reviewed' | 'Approved'
  submittedAt: string
  feedback?: string
  reviewedBy?: string
  reviewedAt?: string
}

export interface Db {
  users: User[]
  students: Student[]
  hosts: Host[]
  vacancies: Vacancy[]
  applications: Application[]
  logbooks: Logbook[]
  visits: Visit[]
  assessments: Assessment[]
  notifications: Notification[]
  reports: Report[]
  config: GradeConfig
  audit: { at: string; by: string; action: string }[]
}
