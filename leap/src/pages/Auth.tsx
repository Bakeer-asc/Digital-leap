import { useState, forwardRef, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useZodForm } from '../lib/form'
import { Button } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { registerStudent, requestPasswordReset } from '../services/api'
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Mail, User, Hash } from 'lucide-react'
import { roleHome } from '../lib/roleRoutes'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const GOLD       = '#C9A84C'   // primary gold
const GOLD_LIGHT = '#E8C97A'   // lighter gold for hover / accents
const GOLD_DIM   = '#8B6914'   // darker gold for borders

// ─────────────────────────────────────────────────────────────────────────────
// Full-page shell — campus photo + black/gold gradient overlay
// ─────────────────────────────────────────────────────────────────────────────
function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* ── Campus background image ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/campus.jpg)' }}
        aria-hidden="true"
      />

      {/* ── Black + gold layered overlay ── */}
      {/* Layer 1 — heavy black base so text stays readable */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.78)' }}
        aria-hidden="true"
      />
      {/* Layer 2 — gold vignette gradient from bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(201,168,76,0.22) 0%, transparent 55%), ' +
            'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 40%)',
        }}
        aria-hidden="true"
      />
      {/* Layer 3 — subtle gold radial glow centred on the card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 48%, rgba(201,168,76,0.08) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* ── Page content (logo + card) ── */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-4 py-10">

        {/* University logo */}
        <div
          className="mb-5 flex flex-col items-center"
          style={{
            filter: 'drop-shadow(0 2px 16px rgba(201,168,76,0.35))',
          }}
        >
          <img
            src="/limkokwing-logo.webp"
            alt="Limkokwing University of Creative Technology"
            className="h-16 w-auto object-contain sm:h-20"
            draggable={false}
          />
        </div>

        {/* Digital LEAP wordmark */}
        <div className="mb-8 text-center">
          <p
            className="text-3xl font-black tracking-widest uppercase"
            style={{ color: GOLD, textShadow: `0 0 24px rgba(201,168,76,0.6)` }}
          >
            Digital LEAP
          </p>
          <p className="mt-1 text-xs tracking-[0.2em] uppercase" style={{ color: '#a89060' }}>
            Limkokwing University · Sierra Leone
          </p>
          {/* gold divider */}
          <div
            className="mx-auto mt-3 h-px w-24"
            style={{
              background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
            }}
          />
        </div>

        {/* Auth card */}
        {children}

        {/* Footer */}
        <p className="mt-6 text-center text-xs" style={{ color: '#5a4a2a' }}>
          © {new Date().getFullYear()} Limkokwing University of Creative Technology, Sierra Leone
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styled card container
// ─────────────────────────────────────────────────────────────────────────────
function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div
      className="w-full rounded-2xl p-7"
      style={{
        background:
          'linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(20,15,5,0.97) 100%)',
        border: `1px solid ${GOLD_DIM}`,
        boxShadow:
          `0 0 0 1px rgba(201,168,76,0.08), ` +
          `0 24px 48px rgba(0,0,0,0.7), ` +
          `0 0 32px rgba(201,168,76,0.08)`,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Card heading */}
      <div className="mb-6">
        <h1
          className="text-xl font-bold tracking-wide"
          style={{ color: GOLD_LIGHT }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm" style={{ color: '#7a6535' }}>
            {subtitle}
          </p>
        )}
        {/* thin gold underline */}
        <div
          className="mt-3 h-px w-12"
          style={{ background: `linear-gradient(to right, ${GOLD}, transparent)` }}
        />
      </div>

      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Gold-styled input field
// ─────────────────────────────────────────────────────────────────────────────
const goldInputCls = [
  'w-full rounded-lg pl-10 pr-4 py-2.5 text-sm',
  'bg-black/60 text-white placeholder-[#4a3a1a]',
  'outline-none transition-all',
].join(' ')

function GoldField({
  label,
  error,
  hint,
  required,
  icon: Icon,
  id,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  icon?: React.ElementType
  id?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1 text-sm">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wider"
        style={{ color: '#9a7a35' }}
      >
        {label}
        {required && <span className="ml-1" style={{ color: GOLD }} aria-hidden>*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: GOLD_DIM }}
          />
        )}
        {children}
      </div>
      {hint && !error && (
        <p className="text-xs" style={{ color: '#5a4a25' }}>{hint}</p>
      )}
      {error && (
        <span role="alert" className="flex items-center gap-1 text-xs" style={{ color: '#e57373' }}>
          <AlertCircle size={11} />
          {error}
        </span>
      )}
    </div>
  )
}

function goldInput(extra = '') {
  return [
    goldInputCls,
    `border focus:ring-2`,
    extra,
  ].join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Password input with show/hide toggle
// ─────────────────────────────────────────────────────────────────────────────
const PasswordInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { autoComplete: string }
>(function PasswordInput({ autoComplete, placeholder = '••••••••', style, ...rest }, ref) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: GOLD_DIM }}
      />
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={goldInput()}
        style={{
          borderColor: GOLD_DIM,
          '--tw-ring-color': `${GOLD}55`,
          ...style,
        } as React.CSSProperties}
        {...rest}
      />
      <button
        type="button"
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 transition-opacity hover:opacity-100 opacity-60"
        style={{ color: GOLD }}
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Gold submit button
// ─────────────────────────────────────────────────────────────────────────────
function GoldButton({
  children,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="w-full rounded-lg py-2.5 text-sm font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: disabled
          ? `linear-gradient(135deg, ${GOLD_DIM}, #5a4010)`
          : `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #a07820 100%)`,
        color: '#0a0a0a',
        boxShadow: disabled ? 'none' : `0 0 20px rgba(201,168,76,0.4), 0 4px 12px rgba(0,0,0,0.5)`,
        letterSpacing: '0.12em',
      }}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Error / success banners
// ─────────────────────────────────────────────────────────────────────────────
function ErrBanner({ msg }: { msg: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg p-3 text-sm"
      style={{
        background: 'rgba(180,30,30,0.15)',
        border: '1px solid rgba(180,30,30,0.4)',
        color: '#ff8a80',
      }}
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{msg}</span>
    </div>
  )
}

function OkBanner({ msg }: { msg: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg p-3 text-sm"
      style={{
        background: 'rgba(201,168,76,0.12)',
        border: `1px solid ${GOLD_DIM}`,
        color: GOLD_LIGHT,
      }}
    >
      <CheckCircle size={15} className="mt-0.5 shrink-0" />
      <span>{msg}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Gold link
// ─────────────────────────────────────────────────────────────────────────────
function GLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="font-medium transition-colors hover:opacity-80"
      style={{ color: GOLD }}
    >
      {children}
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Password strength rule
// ─────────────────────────────────────────────────────────────────────────────
const pw = z
  .string()
  .min(8, 'At least 8 characters.')
  .regex(/[A-Z]/, 'One uppercase letter.')
  .regex(/[0-9]/, 'One number.')

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const { signIn } = useAuth()
  const nav        = useNavigate()
  const [err, setErr] = useState('')

  const f = useZodForm(
    z.object({
      email:    z.string().email('Enter a valid email.'),
      password: z.string().min(1, 'Enter your password.'),
    }),
  )

  return (
    <AuthShell>
      <AuthCard title="Sign in" subtitle="Access your LEAP internship account.">
        <form
          className="space-y-4"
          onSubmit={f.handleSubmit(async (v) => {
            try {
              setErr('')
              const user = await signIn(v.email, v.password)
              nav(roleHome(user.role), { replace: true })
            } catch (e) {
              setErr((e as Error).message)
            }
          })}
        >
          {/* Email */}
          <GoldField label="Email address" id="login-email" error={f.formState.errors.email?.message} icon={Mail}>
            <input
              id="login-email"
              className={goldInput()}
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              style={{ borderColor: GOLD_DIM, '--tw-ring-color': `${GOLD}55` } as React.CSSProperties}
              {...f.register('email')}
            />
          </GoldField>

          {/* Password */}
          <GoldField label="Password" id="login-password" error={f.formState.errors.password?.message}>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              {...f.register('password')}
            />
          </GoldField>

          {err && <ErrBanner msg={err} />}

          <GoldButton type="submit" disabled={f.formState.isSubmitting}>
            {f.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </GoldButton>

          {/* Links row */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <GLink to="/register">Create student account</GLink>
            <GLink to="/forgot-password">Forgot password?</GLink>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const nav = useNavigate()
  const [err, setErr] = useState('')

  const schema = z
    .object({
      name:     z.string().min(3, 'Enter your full name.'),
      email:    z.string().email('Enter a valid email address.'),
      regNo:    z.string().min(4, 'Enter your student ID.'),
      password: pw,
      confirm:  z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      path: ['confirm'],
      message: 'Passwords do not match.',
    })

  const f = useZodForm(schema)
  const e = f.formState.errors

  return (
    <AuthShell>
      <AuthCard title="Create account" subtitle="Register as a student to access the LEAP system.">
        <form
          className="space-y-4"
          onSubmit={f.handleSubmit(async (v) => {
            try {
              await registerStudent(v)
              nav('/login')
            } catch (x) {
              setErr((x as Error).message)
            }
          })}
        >
          <GoldField label="Full name" required error={e.name?.message} icon={User}>
            <input
              className={goldInput()}
              autoComplete="name"
              placeholder="e.g. Aminata Kamara"
              style={{ borderColor: GOLD_DIM, '--tw-ring-color': `${GOLD}55` } as React.CSSProperties}
              {...f.register('name')}
            />
          </GoldField>

          <GoldField label="Email address" required error={e.email?.message} icon={Mail}>
            <input
              className={goldInput()}
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              style={{ borderColor: GOLD_DIM, '--tw-ring-color': `${GOLD}55` } as React.CSSProperties}
              {...f.register('email')}
            />
          </GoldField>

          <GoldField
            label="Student ID"
            required
            error={e.regNo?.message}
            hint="Your university student ID, e.g. 905004000"
            icon={Hash}
          >
            <input
              className={goldInput()}
              placeholder="e.g. 905004000"
              style={{ borderColor: GOLD_DIM, '--tw-ring-color': `${GOLD}55` } as React.CSSProperties}
              {...f.register('regNo')}
            />
          </GoldField>

          <GoldField
            label="Password"
            required
            error={e.password?.message}
            hint="Min 8 characters, one uppercase letter, one number"
          >
            <PasswordInput
              autoComplete="new-password"
              {...f.register('password')}
            />
          </GoldField>

          <GoldField label="Confirm password" required error={e.confirm?.message}>
            <PasswordInput
              autoComplete="new-password"
              {...f.register('confirm')}
            />
          </GoldField>

          {err && <ErrBanner msg={err} />}

          <GoldButton type="submit" disabled={f.formState.isSubmitting}>
            Create account
          </GoldButton>

          <p className="text-center text-xs" style={{ color: '#5a4a25' }}>
            Already have an account?{' '}
            <GLink to="/login">Sign in</GLink>
          </p>
        </form>
      </AuthCard>

      {/* Role note */}
      <p
        className="mt-4 text-center text-xs leading-relaxed"
        style={{ color: '#4a3a1a' }}
      >
        Coordinator, Supervisor, Host and Management accounts are<br />
        created by the LEAP Coordinator.
      </p>
    </AuthShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function ForgotPage() {
  const [msg, setMsg] = useState('')

  const f = useZodForm(z.object({ email: z.string().email('Enter a valid email address.') }))

  return (
    <AuthShell>
      <AuthCard
        title="Reset password"
        subtitle="Enter your registered email. The LEAP Coordinator will be notified to assist you."
      >
        <form
          className="space-y-4"
          onSubmit={f.handleSubmit(async (v) => setMsg(await requestPasswordReset(v.email)))}
        >
          <GoldField label="Email address" required error={f.formState.errors.email?.message} icon={Mail}>
            <input
              className={goldInput()}
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              style={{ borderColor: GOLD_DIM, '--tw-ring-color': `${GOLD}55` } as React.CSSProperties}
              {...f.register('email')}
            />
          </GoldField>

          {msg && <OkBanner msg={msg} />}

          <GoldButton type="submit" disabled={f.formState.isSubmitting}>
            Request password reset
          </GoldButton>

          <p className="text-center text-xs" style={{ color: '#5a4a25' }}>
            <GLink to="/login">← Back to sign in</GLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
