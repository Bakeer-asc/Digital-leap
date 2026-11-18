/**
 * Digital LEAP — Application router
 *
 * URL structure:  /{role}/{page}
 *   e.g.  /student/dashboard
 *         /coordinator/students
 *         /management/reports
 *
 * Guard prevents any authenticated user from reaching another role's pages
 * by checking that the route's role prefix matches their own role.
 * The backend enforces the same permissions independently on every API call.
 */

import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import type { Role } from './types'
import { roleHome } from './lib/roleRoutes'

// ── Auth pages ─────────────────────────────────────────────────────────────
import { ForgotPage, LoginPage, RegisterPage } from './pages/Auth'

// ── Shared pages (accessible by multiple roles, content varies by role) ───
import Dashboard         from './pages/Dashboard'
import Profile           from './pages/Profile'
import Notifications     from './pages/Notifications'
import Reports           from './pages/Reports'

// ── Coordinator pages ─────────────────────────────────────────────────────
import { StudentsPage, HostsPage, UsersPage } from './pages/People'
import Applications      from './pages/Applications'
import Placements        from './pages/Placements'
import Supervisors       from './pages/Supervisors'
import Logbooks          from './pages/Logbooks'
import Visits            from './pages/Visits'
import Assessments       from './pages/Assessments'
import Settings          from './pages/Settings'

// ── Student pages ─────────────────────────────────────────────────────────
import MyPlacement       from './pages/MyPlacement'
import MySupervisor      from './pages/MySupervisor'
import StudentReports    from './pages/StudentReports'

// ── Host pages ────────────────────────────────────────────────────────────
import CurrentInterns    from './pages/CurrentInterns'
import StudentFeedback   from './pages/StudentFeedback'

// ── Management pages ──────────────────────────────────────────────────────
import MgmtStatistics        from './pages/MgmtStatistics'
import SupervisorPerformance from './pages/SupervisorPerformance'

// ── Route guard ────────────────────────────────────────────────────────────
/**
 * Allows access only when the authenticated user's role matches `allowedRole`.
 * On mismatch: redirect to the user's own dashboard (not 403, better UX).
 */
function Guard({
  allowedRole,
  el,
}: {
  allowedRole: Role | Role[]
  el: ReactElement
}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole]
  if (!allowed.includes(user.role as Role)) {
    return <Navigate to={roleHome(user.role as Role)} replace />
  }
  return el
}

// ── Root redirect ──────────────────────────────────────────────────────────
/** Redirect '/' to the role-specific dashboard. */
function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={roleHome(user.role as Role)} replace />
}

/**
 * Legacy short-path redirect.
 * Notification links stored before the role-prefix migration used paths like
 * /logbooks, /placements, /visits. Map them to the user's role-prefixed equivalent.
 */
function LegacyRedirect() {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace />

  const role = user.role as Role
  // Strip leading slash to get the short key
  const short = loc.pathname.replace(/^\//, '').split('/')[0]

  // Try to find a matching nav path in the user's role map
  const roleMap: Record<string, Partial<Record<string, string>>> = {
    student:     { logbooks: '/student/logbook', placements: '/student/placement', visits: '/student/visits', assessments: '/student/results', profile: '/student/profile', 'my-reports': '/student/reports', 'my-supervisor': '/student/supervisor', notifications: '/student/notifications' },
    coordinator: { students: '/coordinator/students', logbooks: '/coordinator/logbooks', placements: '/coordinator/placements', visits: '/coordinator/visits', assessments: '/coordinator/assessments', reports: '/coordinator/reports', hosts: '/coordinator/hosts', users: '/coordinator/users', settings: '/coordinator/settings', notifications: '/coordinator/notifications' },
    supervisor:  { students: '/supervisor/students', logbooks: '/supervisor/logbooks', placements: '/supervisor/placements', visits: '/supervisor/visits', assessments: '/supervisor/assessments', notifications: '/supervisor/notifications' },
    host:        { placements: '/host/applications', hosts: '/host/organisation', visits: '/host/visits', assessments: '/host/feedback', notifications: '/host/notifications', interns: '/host/interns', feedback: '/host/feedback' },
    management:  { assessments: '/management/assessments', reports: '/management/reports', students: '/management/students', placements: '/management/placements', statistics: '/management/statistics', notifications: '/management/notifications' },
  }

  const target = roleMap[role]?.[short]
  if (target) return <Navigate to={target} replace />
  // No mapping — go home
  return <Navigate to={roleHome(role)} replace />
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* ── Public auth routes ── */}
      <Route path="/login"          element={user ? <RoleRedirect /> : <LoginPage />} />
      <Route path="/register"       element={user ? <RoleRedirect /> : <RegisterPage />} />
      <Route path="/forgot-password" element={user ? <RoleRedirect /> : <ForgotPage />} />

      {/* ── Root → role dashboard ── */}
      <Route path="/" element={<RoleRedirect />} />

      {/* ── All protected pages live inside AppLayout ── */}
      <Route element={user ? <AppLayout /> : <Navigate to="/login" replace />}>

        {/* ════════════════════════════════════════════
            STUDENT routes   /student/*
            ════════════════════════════════════════════ */}
        <Route path="student/dashboard"   element={<Guard allowedRole="student"     el={<Dashboard />} />} />
        <Route path="student/profile"     element={<Guard allowedRole="student"     el={<Profile />} />} />
        <Route path="student/applications" element={<Guard allowedRole="student"    el={<Applications />} />} />
        <Route path="student/placement"   element={<Guard allowedRole="student"     el={<MyPlacement />} />} />
        <Route path="student/logbook"     element={<Guard allowedRole="student"     el={<Logbooks />} />} />
        <Route path="student/reports"     element={<Guard allowedRole="student"     el={<StudentReports />} />} />
        <Route path="student/supervisor"  element={<Guard allowedRole="student"     el={<MySupervisor />} />} />
        <Route path="student/visits"      element={<Guard allowedRole="student"     el={<Visits />} />} />
        <Route path="student/results"     element={<Guard allowedRole="student"     el={<Assessments />} />} />
        <Route path="student/notifications" element={<Guard allowedRole="student"   el={<Notifications />} />} />

        {/* ════════════════════════════════════════════
            COORDINATOR routes   /coordinator/*
            ════════════════════════════════════════════ */}
        <Route path="coordinator/dashboard"    element={<Guard allowedRole="coordinator" el={<Dashboard />} />} />
        <Route path="coordinator/profile"      element={<Guard allowedRole="coordinator" el={<Profile />} />} />
        <Route path="coordinator/students"     element={<Guard allowedRole="coordinator" el={<StudentsPage />} />} />
        <Route path="coordinator/applications" element={<Guard allowedRole="coordinator" el={<Applications />} />} />
        <Route path="coordinator/hosts"        element={<Guard allowedRole="coordinator" el={<HostsPage />} />} />
        <Route path="coordinator/placements"   element={<Guard allowedRole="coordinator" el={<Placements />} />} />
        <Route path="coordinator/supervisors"  element={<Guard allowedRole="coordinator" el={<Supervisors />} />} />
        <Route path="coordinator/logbooks"     element={<Guard allowedRole="coordinator" el={<Logbooks />} />} />
        <Route path="coordinator/visits"       element={<Guard allowedRole="coordinator" el={<Visits />} />} />
        <Route path="coordinator/assessments"  element={<Guard allowedRole="coordinator" el={<Assessments />} />} />
        <Route path="coordinator/reports"      element={<Guard allowedRole="coordinator" el={<Reports />} />} />
        <Route path="coordinator/settings"     element={<Guard allowedRole="coordinator" el={<Settings />} />} />
        <Route path="coordinator/users"        element={<Guard allowedRole="coordinator" el={<UsersPage />} />} />
        <Route path="coordinator/notifications" element={<Guard allowedRole="coordinator" el={<Notifications />} />} />

        {/* ════════════════════════════════════════════
            SUPERVISOR routes   /supervisor/*
            ════════════════════════════════════════════ */}
        <Route path="supervisor/dashboard"    element={<Guard allowedRole="supervisor" el={<Dashboard />} />} />
        <Route path="supervisor/profile"      element={<Guard allowedRole="supervisor" el={<Profile />} />} />
        <Route path="supervisor/students"     element={<Guard allowedRole="supervisor" el={<StudentsPage />} />} />
        <Route path="supervisor/placements"   element={<Guard allowedRole="supervisor" el={<Placements />} />} />
        <Route path="supervisor/logbooks"     element={<Guard allowedRole="supervisor" el={<Logbooks />} />} />
        <Route path="supervisor/visits"       element={<Guard allowedRole="supervisor" el={<Visits />} />} />
        <Route path="supervisor/assessments"  element={<Guard allowedRole="supervisor" el={<Assessments />} />} />
        <Route path="supervisor/reports"      element={<Guard allowedRole="supervisor" el={<StudentReports />} />} />
        <Route path="supervisor/notifications" element={<Guard allowedRole="supervisor" el={<Notifications />} />} />

        {/* ════════════════════════════════════════════
            HOST ORGANISATION routes   /host/*
            ════════════════════════════════════════════ */}
        <Route path="host/dashboard"      element={<Guard allowedRole="host" el={<Dashboard />} />} />
        <Route path="host/profile"        element={<Guard allowedRole="host" el={<Profile />} />} />
        <Route path="host/organisation"   element={<Guard allowedRole="host" el={<HostsPage />} />} />
        <Route path="host/applications"   element={<Guard allowedRole="host" el={<Applications />} />} />
        <Route path="host/interns"        element={<Guard allowedRole="host" el={<CurrentInterns />} />} />
        <Route path="host/feedback"       element={<Guard allowedRole="host" el={<StudentFeedback />} />} />
        <Route path="host/visits"         element={<Guard allowedRole="host" el={<Visits />} />} />
        <Route path="host/notifications"  element={<Guard allowedRole="host" el={<Notifications />} />} />

        {/* ════════════════════════════════════════════
            UNIVERSITY MANAGEMENT routes   /management/*
            ════════════════════════════════════════════ */}
        <Route path="management/dashboard"              element={<Guard allowedRole="management" el={<Dashboard />} />} />
        <Route path="management/profile"                element={<Guard allowedRole="management" el={<Profile />} />} />
        <Route path="management/statistics"             element={<Guard allowedRole="management" el={<MgmtStatistics />} />} />
        <Route path="management/students"               element={<Guard allowedRole="management" el={<StudentsPage />} />} />
        <Route path="management/hosts"                  element={<Guard allowedRole="management" el={<HostsPage />} />} />
        <Route path="management/placements"             element={<Guard allowedRole="management" el={<Placements />} />} />
        <Route path="management/supervisor-performance" element={<Guard allowedRole="management" el={<SupervisorPerformance />} />} />
        <Route path="management/assessments"            element={<Guard allowedRole="management" el={<Assessments />} />} />
        <Route path="management/reports"                element={<Guard allowedRole="management" el={<Reports />} />} />
        <Route path="management/notifications"          element={<Guard allowedRole="management" el={<Notifications />} />} />
      </Route>

      {/* ── Catch-all: redirect to dashboard (or login) ── */}
      {/* Legacy short paths from notification links — redirect to role-prefixed equivalents */}
      <Route path="*" element={<LegacyRedirect />} />
    </Routes>
  )
}
