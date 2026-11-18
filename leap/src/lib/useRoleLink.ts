import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

/**
 * Returns a function that prepends the current user's role prefix to a page path.
 *
 * Usage:
 *   const rl = useRoleLink()
 *   <Link to={rl('logbook')}>My Logbook</Link>
 *   // → /student/logbook  (when logged in as student)
 *
 * Pass a path WITHOUT a leading slash.
 * For cross-role links (e.g. coordinator linking to /coordinator/students)
 * you can pass the full path with a leading slash and it will be returned unchanged.
 */

/** Page aliases per role — maps a canonical short name to the full role-prefixed path. */
const ROLE_PAGE_MAP: Record<Role, Record<string, string>> = {
  student: {
    dashboard:    '/student/dashboard',
    profile:      '/student/profile',
    applications: '/student/applications',
    placement:    '/student/placement',
    logbook:      '/student/logbook',
    reports:      '/student/reports',
    supervisor:   '/student/supervisor',
    visits:       '/student/visits',
    results:      '/student/results',
    notifications:'/student/notifications',
    // aliases used in Dashboard quick links
    'my-reports':    '/student/reports',
    'my-supervisor': '/student/supervisor',
    placements:      '/student/placement',
    assessments:     '/student/results',
  },
  coordinator: {
    dashboard:    '/coordinator/dashboard',
    profile:      '/coordinator/profile',
    students:     '/coordinator/students',
    applications: '/coordinator/applications',
    hosts:        '/coordinator/hosts',
    placements:   '/coordinator/placements',
    supervisors:  '/coordinator/supervisors',
    logbooks:     '/coordinator/logbooks',
    visits:       '/coordinator/visits',
    assessments:  '/coordinator/assessments',
    reports:      '/coordinator/reports',
    settings:     '/coordinator/settings',
    users:        '/coordinator/users',
    notifications:'/coordinator/notifications',
  },
  supervisor: {
    dashboard:    '/supervisor/dashboard',
    profile:      '/supervisor/profile',
    students:     '/supervisor/students',
    placements:   '/supervisor/placements',
    logbooks:     '/supervisor/logbooks',
    visits:       '/supervisor/visits',
    assessments:  '/supervisor/assessments',
    reports:      '/supervisor/reports',
    'my-reports': '/supervisor/reports',
    notifications:'/supervisor/notifications',
  },
  host: {
    dashboard:    '/host/dashboard',
    profile:      '/host/profile',
    organisation: '/host/organisation',
    hosts:        '/host/organisation',
    applications: '/host/applications',
    interns:      '/host/interns',
    feedback:     '/host/feedback',
    visits:       '/host/visits',
    notifications:'/host/notifications',
  },
  management: {
    dashboard:              '/management/dashboard',
    profile:                '/management/profile',
    statistics:             '/management/statistics',
    students:               '/management/students',
    hosts:                  '/management/hosts',
    placements:             '/management/placements',
    'supervisor-performance': '/management/supervisor-performance',
    assessments:            '/management/assessments',
    reports:                '/management/reports',
    notifications:          '/management/notifications',
  },
}

export function useRoleLink() {
  const { user } = useAuth()

  return function roleLink(page: string): string {
    // Already a full path (starts with /) — return as-is
    if (page.startsWith('/')) return page
    if (!user) return '/login'
    const map = ROLE_PAGE_MAP[user.role as Role]
    return map[page] ?? `/${user.role}/${page}`
  }
}
