import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

// ---- Status badge colours ----
const tone: Record<string, string> = {
  Pending:                  'bg-amber-50 text-warn border border-amber-200',
  'Under Review':           'bg-blue-50 text-brand border border-blue-200',
  'Awaiting Host Response': 'bg-blue-50 text-brand border border-blue-200',
  Confirmed:                'bg-green-50 text-ok border border-green-200',
  Approved:                 'bg-green-50 text-ok border border-green-200',
  Completed:                'bg-green-50 text-ok border border-green-200',
  Published:                'bg-green-50 text-ok border border-green-200',
  Verified:                 'bg-green-50 text-ok border border-green-200',
  Active:                   'bg-green-50 text-ok border border-green-200',
  Declined:                 'bg-red-50 text-bad border border-red-200',
  Rejected:                 'bg-red-50 text-bad border border-red-200',
  Cancelled:                'bg-red-50 text-bad border border-red-200',
  Withdrawn:                'bg-red-50 text-bad border border-red-200',
  Returned:                 'bg-red-50 text-bad border border-red-200',
  'Revision Requested':     'bg-amber-50 text-warn border border-amber-200',
  Draft:                    'bg-slate-50 text-muted border border-line',
  Submitted:                'bg-blue-50 text-brand border border-blue-200',
  Scheduled:                'bg-blue-50 text-brand border border-blue-200',
  Computed:                 'bg-teal-50 text-teal border border-teal-200',
  'Awaiting Approval':      'bg-amber-50 text-warn border border-amber-200',
  'In Progress':            'bg-blue-50 text-brand border border-blue-200',
  Deactivated:              'bg-slate-50 text-muted border border-line',
  Locked:                   'bg-red-50 text-bad border border-red-200',
  'No application':         'bg-slate-50 text-muted border border-line',
}

export const Badge = ({ children }: { children: string }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[children] ?? 'bg-slate-100 text-muted border border-line'}`}>
    {children}
  </span>
)

// ---- Buttons ----
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal'
  size?: 'sm' | 'md'
}
export const Button = ({ variant = 'primary', size = 'md', className = '', ...p }: BtnProps) => {
  const v = {
    primary:   'bg-navy text-white hover:bg-navy/90 shadow-sm',
    secondary: 'bg-teal text-white hover:bg-teal/90 shadow-sm',
    ghost:     'border border-line bg-white text-ink hover:bg-slate-50 shadow-sm',
    danger:    'bg-bad text-white hover:bg-red-700 shadow-sm',
    teal:      'bg-teal text-white hover:bg-teal/90 shadow-sm',
  }[variant]
  const s = size === 'sm' ? 'min-h-[32px] px-3 text-xs' : 'min-h-[40px] px-4 text-sm'
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${s} ${className}`}
    />
  )
}

// ---- Card ----
export const Card = ({
  title, action, children, className = '', description,
}: {
  title?: string
  action?: ReactNode
  description?: string
  children: ReactNode
  className?: string
}) => (
  <section className={`rounded-xl border border-line bg-white shadow-sm ${className}`}>
    {(title || action) && (
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
)

// ---- Stat card ----
export const Stat = ({
  label, value, hint, icon, trend,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  trend?: { value: string; positive?: boolean }
}) => (
  <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        {trend && (
          <p className={`mt-1 text-xs font-medium ${trend.positive ? 'text-ok' : 'text-bad'}`}>
            {trend.value}
          </p>
        )}
      </div>
      {icon && (
        <div className="rounded-lg bg-navy/5 p-2.5 text-navy shrink-0">
          {icon}
        </div>
      )}
    </div>
  </div>
)

// ---- Empty state ----
export const Empty = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="py-12 text-center">
    <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 grid place-items-center text-muted">
      <Info size={20} />
    </div>
    <p className="font-medium text-ink">{title}</p>
    {hint && <p className="mt-1 text-sm text-muted max-w-sm mx-auto">{hint}</p>}
  </div>
)

// ---- Loading ----
export const Loading = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3" role="status">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-navy" />
    <p className="text-sm text-muted">Loading…</p>
  </div>
)

// ---- Skeleton ----
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />
)

// ---- Error ----
export const ErrorBox = ({ error }: { error: unknown }) => (
  <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-bad">
    <AlertCircle size={16} className="mt-0.5 shrink-0" />
    <span>{error instanceof Error ? error.message : 'Something went wrong.'}</span>
  </div>
)

// ---- Alert banner ----
type AlertType = 'info' | 'warning' | 'error' | 'success'
const alertStyles: Record<AlertType, string> = {
  info:    'border-blue-200 bg-blue-50 text-brand',
  warning: 'border-amber-200 bg-amber-50 text-warn',
  error:   'border-red-200 bg-red-50 text-bad',
  success: 'border-green-200 bg-green-50 text-ok',
}
const alertIcons: Record<AlertType, typeof Info> = {
  info: Info, warning: AlertTriangle, error: AlertCircle, success: CheckCircle,
}
export const Alert = ({ type = 'info', children }: { type?: AlertType; children: ReactNode }) => {
  const Icon = alertIcons[type]
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${alertStyles[type]}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

// ---- Form controls ----
export const Field = ({
  label, error, hint, required, children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}) => (
  <div className="text-sm">
    <label className="block">
      <span className="mb-1.5 block font-medium text-ink">
        {label}
        {required && <span className="ml-1 text-bad" aria-hidden="true">*</span>}
      </span>
      {children}
    </label>
    {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
    {error && (
      <span role="alert" className="mt-1 flex items-center gap-1 text-xs text-bad">
        <AlertCircle size={12} />
        {error}
      </span>
    )}
  </div>
)

export const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted'

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`${inputCls} ${p.className ?? ''}`} />
)

export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`${inputCls} ${p.className ?? ''}`} />
)

export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`${inputCls} resize-none ${p.className ?? ''}`} />
)

// ---- Table ----
export const Table = ({ head, children }: { head: string[]; children: ReactNode }) => (
  <div className="overflow-x-auto rounded-lg border border-line">
    <table className="w-full min-w-[600px] text-left text-sm">
      <thead>
        <tr className="border-b border-line bg-slate-50">
          {head.map((h) => (
            <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
  </div>
)

export const Td = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <td className={`px-4 py-3 align-top text-sm text-ink ${className}`}>{children ?? <span className="text-muted">—</span>}</td>
)

export const Tr = ({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) => (
  <tr
    onClick={onClick}
    className={`transition-colors hover:bg-slate-50 ${onClick ? 'cursor-pointer' : ''}`}
  >
    {children}
  </tr>
)

// ---- Page header ----
export const PageHeader = ({
  title, description, action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
)

// ---- Search input ----
export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) => (
  <div className={`relative ${className}`}>
    <svg
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputCls} pl-9`}
      aria-label={placeholder}
    />
  </div>
)

// ---- Modal ----
export function Modal({
  title, onClose, children, wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ---- Confirm dialog ----
export function Confirm({
  title, message, confirmLabel, onConfirm, onClose, danger,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  danger?: boolean
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="mb-6 text-sm text-muted">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={() => { onConfirm(); onClose() }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

// ---- Detail item ----
export const DetailItem = ({
  label, value,
}: {
  label: string
  value?: ReactNode
}) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
    <dd className="mt-1 text-sm text-ink">{value ?? <span className="text-muted">—</span>}</dd>
  </div>
)

// ---- Section divider ----
export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted border-b border-line pb-2">
    {children}
  </h3>
)

// ---- Toasts ----
type Toast = { id: number; text: string; bad?: boolean }
const ToastCtx = createContext<(text: string, bad?: boolean) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((text: string, bad?: boolean) => {
    const id = Date.now() + Math.random()
    setItems((i) => [...i, { id, text, bad }])
    setTimeout(() => setItems((i) => i.filter((t) => t.id !== id)), 4500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2 max-w-sm w-full px-4" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
              t.bad ? 'bg-bad' : 'bg-navy'
            }`}
          >
            {t.bad ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle size={16} className="mt-0.5 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
