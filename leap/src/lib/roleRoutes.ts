import type { Role } from '../types'

/**
 * Maps each role to its canonical dashboard URL.
 * Used by login redirect, Guard, and any "go home" link.
 */
export const ROLE_HOME: Record<Role, string> = {
  student:     '/student/dashboard',
  coordinator: '/coordinator/dashboard',
  supervisor:  '/supervisor/dashboard',
  host:        '/host/dashboard',
  management:  '/management/dashboard',
}

/** Returns the home dashboard path for a role. */
export function roleHome(role: Role): string {
  return ROLE_HOME[role]
}
