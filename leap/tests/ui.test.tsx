// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../src/App'
import { AuthProvider } from '../src/context/AuthContext'
import { ToastProvider } from '../src/components/ui'
import { NAV } from '../src/layouts/AppLayout'
import { resetDb } from '../src/services/store'
import * as api from '../src/services/api'
import type { Role } from '../src/types'
import { ROLE_HOME } from '../src/lib/roleRoutes'

class RO { observe() {} unobserve() {} disconnect() {} }
;(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO
window.scrollTo = () => {}

const mount = (path: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )

beforeEach(() => { cleanup(); resetDb() })

describe('UI smoke: every page renders for every role without errors', () => {
  const roles: [Role, string][] = [
    ['student', 'student1'],
    ['coordinator', 'coordinator'],
    ['supervisor', 'supervisor'],
    ['host', 'host'],
    ['management', 'management'],
  ]

  for (const [role, id] of roles) {
    it(`${role}: all navigation pages`, async () => {
      await api.login(`${id}@leap.demo`, 'Demo@12345')
      for (const item of NAV[role]) {
        cleanup()
        mount(item.to)
        await waitFor(() => expect(screen.getAllByText(item.label).length).toBeGreaterThan(0))
        await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull())
        expect(screen.queryByRole('alert')).toBeNull()
      }
    })
  }

  it('login form validates and signs in through the UI; wrong password shows error', async () => {
    api.logout()
    const u = userEvent.setup()
    mount('/login')
    await u.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email.')).toBeTruthy()
    await u.type(screen.getByLabelText('Email address'), 'student1@leap.demo')
    await u.type(screen.getByLabelText('Password'), 'bad')
    await u.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/2 attempt\(s\) left/)).toBeTruthy()
    await u.clear(screen.getByLabelText('Password'))
    await u.type(screen.getByLabelText('Password'), 'Demo@12345')
    await u.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/Welcome, Aminata/)).toBeTruthy()
  })

  it('route guard: student cannot open coordinator page', async () => {
    await api.login('student1@leap.demo', 'Demo@12345')
    // Attempt to access a coordinator-only URL — Guard redirects to student dashboard
    mount('/coordinator/settings')
    expect(await screen.findByText(/Welcome, Aminata/)).toBeTruthy()
  })

  it('student submits a logbook through the form', async () => {
    await api.login('student1@leap.demo', 'Demo@12345')
    const u = userEvent.setup()
    mount('/student/logbook')
    await u.type(await screen.findByLabelText('Date'), '2026-11-12')
    await u.type(screen.getByLabelText('Hours worked'), '40')
    await u.type(screen.getByLabelText('Activities performed'), 'Wrote unit tests for the API.')
    await u.type(screen.getByLabelText('Skills acquired'), 'Testing')
    await u.click(screen.getByRole('button', { name: 'Submit logbook' }))
    expect(await screen.findByText(/Week 2/)).toBeTruthy()
  })

  it('logbook form shows validation and rule errors', async () => {
    await api.login('student1@leap.demo', 'Demo@12345')
    const u = userEvent.setup()
    mount('/student/logbook')
    await u.click(await screen.findByRole('button', { name: 'Submit logbook' }))
    expect(await screen.findByText('Choose a date.')).toBeTruthy()
    await u.type(screen.getByLabelText('Date'), '2026-01-05')
    await u.type(screen.getByLabelText('Hours worked'), '10')
    await u.type(screen.getByLabelText('Activities performed'), 'Some activities here.')
    await u.type(screen.getByLabelText('Skills acquired'), 'X')
    await u.click(screen.getByRole('button', { name: 'Submit logbook' }))
    expect(await screen.findByText(/within your placement period/)).toBeTruthy()
  })
})
