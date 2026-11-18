import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell, BookOpen, Building2, CalendarCheck, ChevronsLeft, ChevronsRight,
  ClipboardCheck, FileBarChart, GraduationCap, LayoutDashboard, LogOut, Menu,
  Settings, Users, UserCog, X, Briefcase, type LucideIcon, ChevronRight,
  FileText, TrendingUp, BarChart3,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks'
import { listNotifications } from '../services/api'
import type { Role } from '../types'
import { ROLE_HOME } from '../lib/roleRoutes'

interface Item { to: string; label: string; icon: LucideIcon }

const N = (role: Role): Item => ({
  to: `/${role}/notifications`,
  label: 'Notifications',
  icon: Bell,
})
const P = (role: Role): Item => ({
  to: `/${role}/profile`,
  label: 'My Profile',
  icon: UserCog,
})

/** All navigation definitions. Every `to` is role-prefixed so routes are unambiguous. */
export const NAV: Record<Role, Item[]> = {
  // ── Student ──────────────────────────────────────────────────────────────
  student: [
    { to: ROLE_HOME.student,              label: 'Dashboard',               icon: LayoutDashboard },
    P('student'),
    { to: '/student/applications',         label: 'Internship Applications', icon: Briefcase },
    { to: '/student/placement',            label: 'My Placement',            icon: Building2 },
    { to: '/student/logbook',              label: 'My Logbook',              icon: BookOpen },
    { to: '/student/reports',              label: 'My Reports',              icon: FileText },
    { to: '/student/supervisor',           label: 'My Supervisor',           icon: UserCog },
    { to: '/student/visits',              label: 'Visits',                   icon: CalendarCheck },
    { to: '/student/results',             label: 'Results',                  icon: ClipboardCheck },
    N('student'),
  ],
  // ── Coordinator ──────────────────────────────────────────────────────────
  coordinator: [
    { to: ROLE_HOME.coordinator,          label: 'Dashboard',           icon: LayoutDashboard },
    { to: '/coordinator/students',        label: 'Students',            icon: GraduationCap },
    { to: '/coordinator/applications',    label: 'Applications',        icon: Briefcase },
    { to: '/coordinator/hosts',           label: 'Host Organisations',  icon: Building2 },
    { to: '/coordinator/placements',      label: 'Placements',          icon: Briefcase },
    { to: '/coordinator/supervisors',     label: 'Supervisors',         icon: Users },
    { to: '/coordinator/logbooks',        label: 'Logbooks',            icon: BookOpen },
    { to: '/coordinator/visits',          label: 'Visits',              icon: CalendarCheck },
    { to: '/coordinator/assessments',     label: 'Assessments',         icon: ClipboardCheck },
    { to: '/coordinator/reports',         label: 'Reports',             icon: FileBarChart },
    { to: '/coordinator/settings',        label: 'Grade Settings',      icon: Settings },
    { to: '/coordinator/users',           label: 'Accounts & Roles',    icon: Users },
    P('coordinator'),
    N('coordinator'),
  ],
  // ── Supervisor ───────────────────────────────────────────────────────────
  supervisor: [
    { to: ROLE_HOME.supervisor,           label: 'Dashboard',            icon: LayoutDashboard },
    { to: '/supervisor/students',         label: 'My Students',          icon: GraduationCap },
    { to: '/supervisor/placements',       label: 'Student Placements',   icon: Briefcase },
    { to: '/supervisor/logbooks',         label: 'Logbook Reviews',      icon: BookOpen },
    { to: '/supervisor/visits',           label: 'Visits',               icon: CalendarCheck },
    { to: '/supervisor/assessments',      label: 'Assessments',          icon: ClipboardCheck },
    { to: '/supervisor/reports',          label: 'Reports',              icon: FileText },
    P('supervisor'),
    N('supervisor'),
  ],
  // ── Host ─────────────────────────────────────────────────────────────────
  host: [
    { to: ROLE_HOME.host,                 label: 'Dashboard',            icon: LayoutDashboard },
    { to: '/host/organisation',           label: 'Organisation Profile', icon: Building2 },
    { to: '/host/applications',           label: 'Applications',         icon: Briefcase },
    { to: '/host/interns',                label: 'Current Interns',      icon: GraduationCap },
    { to: '/host/feedback',              label: 'Student Feedback',       icon: ClipboardCheck },
    { to: '/host/visits',                 label: 'Visits',               icon: CalendarCheck },
    P('host'),
    N('host'),
  ],
  // ── Management ──────────────────────────────────────────────────────────
  management: [
    { to: ROLE_HOME.management,                   label: 'Dashboard',              icon: LayoutDashboard },
    { to: '/management/statistics',               label: 'Internship Statistics',  icon: BarChart3 },
    { to: '/management/students',                 label: 'Students',               icon: GraduationCap },
    { to: '/management/hosts',                    label: 'Host Organisations',     icon: Building2 },
    { to: '/management/placements',               label: 'Placement Statistics',   icon: Briefcase },
    { to: '/management/supervisor-performance',   label: 'Supervisor Performance', icon: TrendingUp },
    { to: '/management/assessments',              label: 'Assessment Results',     icon: ClipboardCheck },
    { to: '/management/reports',                  label: 'Management Reports',     icon: FileBarChart },
    P('management'),
    N('management'),
  ],
}

export const ROLE_LABEL: Record<Role, string> = {
  student:     'Student',
  coordinator: 'LEAP Coordinator',
  supervisor:  'Academic Supervisor',
  host:        'Host Organisation',
  management:  'University Management',
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen]           = useState(false)
  const loc                        = useLocation()
  const notes                      = useApi('notifications', listNotifications)
  if (!user) return null

  const items  = NAV[user.role]
  const unread = notes.data?.filter((n) => !n.read).length ?? 0

  const currentItem = items.find((i) =>
    i.to === ROLE_HOME[user.role]
      ? loc.pathname === i.to
      : loc.pathname.startsWith(i.to),
  )
  const pageTitle = currentItem?.label ?? 'LEAP'

  // ── Sidebar nav item ───────────────────────────────────────────────────
  const NavItem = ({ to, label, icon: Icon, mini }: Item & { mini: boolean }) => (
    <NavLink
      to={to}
      end={to === ROLE_HOME[user.role]}
      onClick={() => setOpen(false)}
      title={label}
      className={({ isActive }) =>
        `flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors
         ${isActive
           ? 'bg-white/15 text-white'
           : 'text-slate-300 hover:bg-white/10 hover:text-white'}`
      }
    >
      <Icon size={18} className="shrink-0" />
      {!mini && <span className="truncate">{label}</span>}
    </NavLink>
  )

  const nav = (mini: boolean) => (
    <nav aria-label="Main navigation" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {items.map((item) => <NavItem key={item.to} {...item} mini={mini} />)}
    </nav>
  )

  const foot = (mini: boolean) => (
    <div className="border-t border-white/10 px-3 pb-3 pt-3">
      {!mini && (
        <div className="mb-3 rounded-lg bg-white/10 px-3 py-2">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
        </div>
      )}
      <button
        onClick={signOut}
        title="Sign out"
        className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
      >
        <LogOut size={16} className="shrink-0" />
        {!mini && 'Sign out'}
      </button>
    </div>
  )

  const brand = (mini: boolean) => (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
      <img
        src="/limkokwing-logo.webp"
        alt="Limkokwing University"
        className={`object-contain ${mini ? 'h-7 w-auto' : 'h-8 w-auto'}`}
      />
      {!mini && (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-none text-white">Digital LEAP</p>
          <p className="truncate text-[10px] text-slate-400 mt-0.5">Limkokwing Sierra Leone</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden flex-col bg-navy shadow-lg transition-all duration-200 md:flex
          ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {brand(collapsed)}
        {nav(collapsed)}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="mx-3 mb-2 flex items-center justify-center rounded-lg py-2 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
        {foot(collapsed)}
      </aside>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-navy shadow-xl">
            <button
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
            {brand(false)}
            {nav(false)}
            {foot(false)}
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="min-w-0 flex-1 flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 shadow-sm">
          <button
            className="rounded-lg p-2 text-muted hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <span className="hidden text-xs text-muted md:block shrink-0">LEAP</span>
            <ChevronRight size={14} className="hidden text-line md:block shrink-0" />
            <h1 className="truncate text-sm font-semibold text-ink">{pageTitle}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NavLink
              to={`/${user.role}/notifications`}
              aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
              className="relative rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-ink"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-bad px-1 text-[10px] font-semibold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>

            <NavLink
              to={`/${user.role}/profile`}
              className="flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-1.5 hover:bg-slate-100 transition-colors"
              title="My Profile"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full bg-navy text-xs font-semibold text-white shrink-0"
                aria-hidden="true"
              >
                {user.name[0]}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-ink leading-none">{user.name.split(' ')[0]}</p>
                <p className="text-[10px] text-muted mt-0.5">{ROLE_LABEL[user.role]}</p>
              </div>
            </NavLink>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
