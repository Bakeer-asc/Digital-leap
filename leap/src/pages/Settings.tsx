import { useEffect, useState } from 'react'
import { Alert, Button, Card, ErrorBox, Field, Loading, PageHeader, SectionTitle, inputCls } from '../components/ui'
import { useAction, useApi } from '../hooks'
import { getConfig, saveConfig } from '../services/api'
import { validateConfig } from '../lib/grade'
import type { GradeConfig } from '../types'
import { Plus, Trash2 } from 'lucide-react'

const num = (v: string) => (v === '' ? NaN : Number(v))

export default function Settings() {
  const q = useApi('config', getConfig)
  const [c, setC] = useState<GradeConfig | null>(null)
  useEffect(() => { if (q.data) setC(q.data) }, [q.data])
  const save = useAction((x: GradeConfig) => saveConfig(x), 'Grade configuration saved')

  if (q.isLoading || !c) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />

  const errors = validateConfig(c)

  const W = ({
    label, value, on, hint,
  }: {
    label: string
    value: number | null
    on: (n: number) => void
    hint?: string
  }) => (
    <Field label={label} hint={hint}>
      <input
        type="number"
        min={0}
        max={100}
        className={inputCls}
        value={Number.isNaN(value) ? '' : value ?? ''}
        onChange={(e) => on(num(e.target.value))}
      />
    </Field>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Grade Settings"
        description="Configure assessment weightings, group weights and grade boundaries for the internship programme."
      />

      <Alert type="warning">
        Changes to grade settings affect all future computations. Ensure the totals are approved by the Internship Office before saving.
      </Alert>

      {/* Practical Internship weights */}
      <Card
        title="Practical Internship weights"
        description="Component weights must total 100%."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <W
            label="Logbook / Diary (%)"
            value={c.practical.logbook}
            on={(n) => setC({ ...c, practical: { ...c.practical, logbook: n } })}
          />
          <W
            label="Supervisor Form D (%)"
            value={c.practical.formD}
            on={(n) => setC({ ...c, practical: { ...c.practical, formD: n } })}
          />
          <W
            label="Student Self Evaluation (%)"
            value={c.practical.selfEval}
            on={(n) => setC({ ...c, practical: { ...c.practical, selfEval: n } })}
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          Current total: {(c.practical.logbook ?? 0) + (c.practical.formD ?? 0) + (c.practical.selfEval ?? 0)}%
          {(c.practical.logbook ?? 0) + (c.practical.formD ?? 0) + (c.practical.selfEval ?? 0) === 100
            ? ' ✓'
            : ' — must equal 100'}
        </p>
      </Card>

      {/* Report and Career Fair weights */}
      <Card
        title="Internship Report and Career Fair weights"
        description="Component weights must total 100%."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <W
            label="Internship Report (%)"
            value={c.other.report}
            on={(n) => setC({ ...c, other: { ...c.other, report: n } })}
          />
          <W
            label="Career Fair (%)"
            value={c.other.careerFair}
            on={(n) => setC({ ...c, other: { ...c.other, careerFair: n } })}
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          Current total: {(c.other.report ?? 0) + (c.other.careerFair ?? 0)}%
          {(c.other.report ?? 0) + (c.other.careerFair ?? 0) === 100 ? ' ✓' : ' — must equal 100'}
        </p>
      </Card>

      {/* Overall group weights */}
      <Card
        title="Overall group weights"
        description="How the two groups combine into the final grade. Leave both empty until confirmed by the university."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <W
            label="Practical Internship group (%)"
            value={c.groups.practical}
            on={(n) => setC({ ...c, groups: { ...c.groups, practical: Number.isNaN(n) ? null : n } })}
          />
          <W
            label="Report + Career Fair group (%)"
            value={c.groups.other}
            on={(n) => setC({ ...c, groups: { ...c.groups, other: Number.isNaN(n) ? null : n } })}
          />
        </div>
        {c.groups.practical !== null && c.groups.other !== null && (
          <p className="mt-3 text-xs text-muted">
            Current total: {(c.groups.practical ?? 0) + (c.groups.other ?? 0)}%
            {(c.groups.practical ?? 0) + (c.groups.other ?? 0) === 100 ? ' ✓' : ' — must equal 100'}
          </p>
        )}
      </Card>

      {/* Grade bands */}
      <Card
        title="Grade bands"
        description="Define the percentage ranges for each grade. Ranges must not overlap."
        action={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setC({ ...c, bands: [...c.bands, { grade: '', min: 0, max: 0 }] })}
          >
            <Plus size={14} /> Add band
          </Button>
        }
      >
        {c.bands.length === 0 && (
          <p className="mb-3 text-sm text-muted">No grade bands configured. Add the approved grade boundaries below.</p>
        )}
        <div className="space-y-3">
          {c.bands.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3">
              <Field label="Grade label">
                <input
                  className={inputCls}
                  value={b.grade}
                  placeholder="e.g. A"
                  onChange={(e) =>
                    setC({ ...c, bands: c.bands.map((x, j) => (j === i ? { ...x, grade: e.target.value } : x)) })
                  }
                />
              </Field>
              <Field label="Min %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputCls}
                  value={b.min}
                  onChange={(e) =>
                    setC({ ...c, bands: c.bands.map((x, j) => (j === i ? { ...x, min: num(e.target.value) } : x)) })
                  }
                />
              </Field>
              <Field label="Max %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputCls}
                  value={b.max}
                  onChange={(e) =>
                    setC({ ...c, bands: c.bands.map((x, j) => (j === i ? { ...x, max: num(e.target.value) } : x)) })
                  }
                />
              </Field>
              <div className="pb-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove band ${b.grade || i + 1}`}
                  onClick={() => setC({ ...c, bands: c.bands.filter((_, j) => j !== i) })}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-bad space-y-1">
          {errors.map((e) => (
            <li key={e} className="flex items-start gap-2">
              <span>•</span> {e}
            </li>
          ))}
        </ul>
      )}

      <Button
        disabled={errors.length > 0 || save.isPending}
        onClick={() => save.mutate(c)}
      >
        Save configuration
      </Button>
    </div>
  )
}
