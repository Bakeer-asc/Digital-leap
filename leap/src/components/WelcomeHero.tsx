/**
 * WelcomeHero — Animated globe welcome section for the Digital LEAP dashboard.
 *
 * Layout  : two-column on md+ (globe left, text right), stacked on mobile.
 * Globe   : the globe.jpg asset with CSS perspective + rotateY animation.
 * BG      : deep purple / navy gradient + grid + orbital rings + particles.
 * Text    : role-personalised heading + tagline + character-by-character typing.
 * Icons   : four floating translucent icon cards (decorative).
 *
 * All animations respect prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from 'react'
import { Palette, Code2, Globe2, Briefcase } from 'lucide-react'
import type { Role } from '../types'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  deepPurple:  '#17132F',
  navy:        '#11142C',
  purple:      '#32164B',
  pink:        '#E77BC1',
  lavender:    '#A98BD8',
  grid:        'rgba(169,139,216,0.07)',
  border:      'rgba(169,139,216,0.18)',
  iconBg:      'rgba(23,19,47,0.82)',
}

// ─── Full system description (typed character by character) ───────────────────
const DESCRIPTION = `Digital LEAP is a web-based Internship Management System developed for Limkokwing University of Creative Technology, Sierra Leone. It is designed to simplify, streamline and centralise the management of the university's internship programme by connecting students, LEAP Coordinators, Academic Supervisors, Host Organisations and University Management on one platform.

The system enables students to manage internship applications, track placements, submit logbooks and upload reports. It also allows coordinators to manage students, organisations and placements, supervisors to monitor and assess assigned students, host organisations to manage internship opportunities, and university management to monitor overall internship performance and generate reports.

Digital LEAP aims to make internship management more organised, transparent, efficient and accessible through a centralised digital platform.`

// ─── Role-personalised greetings ─────────────────────────────────────────────
const ROLE_MSG: Record<Role, string> = {
  student:     'Your journey towards professional experience starts here.',
  coordinator: 'Manage and coordinate the university internship programme.',
  supervisor:  'Monitor, guide and support your assigned students.',
  host:        'Connect with students and manage your internship opportunities.',
  management:  'Monitor institutional internship performance and progress.',
}

// ─── Floating icon cards ──────────────────────────────────────────────────────
const ICONS = [
  { Icon: Palette,  label: 'Creative Tech',    delay: '0s',    pos: 'top-[8%]  left-[3%]'  },
  { Icon: Code2,    label: 'Development',       delay: '0.6s',  pos: 'top-[6%]  right-[4%]' },
  { Icon: Globe2,   label: 'Global Connect',    delay: '1.2s',  pos: 'bottom-[12%] left-[3%]' },
  { Icon: Briefcase,label: 'Career & Internship', delay: '1.8s', pos: 'bottom-[8%] right-[4%]' },
]

// ─── Typing hook ──────────────────────────────────────────────────────────────
function useTyping(text: string, speed = 18, reduced = false) {
  const [displayed, setDisplayed] = useState(reduced ? text : '')
  const [done, setDone]           = useState(reduced)

  useEffect(() => {
    if (reduced) { setDisplayed(text); setDone(true); return }
    setDisplayed('')
    setDone(false)
    let i = 0
    const tick = () => {
      i++
      setDisplayed(text.slice(0, i))
      if (i < text.length) {
        // Slight pause at paragraph breaks
        const ch = text[i - 1]
        const pause = ch === '\n' ? 180 : ch === '.' ? 60 : speed
        timer = window.setTimeout(tick, pause)
      } else {
        setDone(true)
      }
    }
    let timer = window.setTimeout(tick, 600) // initial delay
    return () => window.clearTimeout(timer)
  }, [text, speed, reduced])

  return { displayed, done }
}

// ─── Particle dots ────────────────────────────────────────────────────────────
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x:  Math.round(10 + Math.random() * 80),
  y:  Math.round(5  + Math.random() * 90),
  r:  Math.round(1  + Math.random() * 2),
  dur: (3 + Math.random() * 4).toFixed(1),
  delay: (Math.random() * 3).toFixed(1),
}))

// ─── Main component ───────────────────────────────────────────────────────────
interface WelcomeHeroProps {
  role: Role
  name: string
}

export default function WelcomeHero({ role, name }: WelcomeHeroProps) {
  const reduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const { displayed, done } = useTyping(DESCRIPTION, 18, reduced)
  const firstName = name.split(' ')[0]

  return (
    <section
      aria-label="Welcome to Digital LEAP"
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        background: `radial-gradient(ellipse 80% 70% at 60% 40%, ${C.purple}88 0%, ${C.navy} 55%, ${C.deepPurple} 100%)`,
        minHeight: 'clamp(420px, 56vw, 620px)',
      }}
    >
      {/* ── Background grid ── */}
      <GridPattern />

      {/* ── Soft glow blobs ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute rounded-full"
          style={{
            width: '45%', height: '55%',
            top: '5%', left: '30%',
            background: `radial-gradient(circle, ${C.purple}44 0%, transparent 70%)`,
            filter: 'blur(48px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '30%', height: '40%',
            bottom: '0', right: '5%',
            background: `radial-gradient(circle, ${C.pink}22 0%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* ── Floating particles ── */}
      <Particles reduced={reduced} />

      {/* ── Main two-column layout ── */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-5 py-8 md:flex-row md:items-center md:gap-10 md:px-10 md:py-10 lg:px-14">

        {/* ── Left: Globe + orbital rings + floating icons ── */}
        <div
          className="relative flex shrink-0 items-center justify-center"
          style={{ width: 'clamp(220px, 38vw, 400px)', height: 'clamp(220px, 38vw, 400px)' }}
        >
          {/* Orbital rings */}
          <OrbitalRings reduced={reduced} />

          {/* Floating icon cards */}
          {ICONS.map(({ Icon, label, delay, pos }) => (
            <FloatingIconCard
              key={label}
              Icon={Icon}
              label={label}
              delay={delay}
              pos={pos}
              reduced={reduced}
            />
          ))}

          {/* Globe image */}
          <AnimatedGlobe reduced={reduced} />

          {/* Shadow disc beneath globe */}
          <div
            className="absolute bottom-[-4%] left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: '60%', height: '10%',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)',
              filter: 'blur(8px)',
            }}
            aria-hidden
          />
        </div>

        {/* ── Right: Text content ── */}
        <div className="min-w-0 flex-1 text-left">
          {/* Eyebrow */}
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: C.pink }}
          >
            Limkokwing University · Sierra Leone
          </p>

          {/* Main heading */}
          <h2
            className="text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl"
            style={{ color: '#ffffff' }}
          >
            Welcome to{' '}
            <span
              style={{
                color: C.lavender,
                textShadow: `0 0 24px ${C.lavender}66`,
              }}
            >
              Digital LEAP
            </span>
          </h2>

          {/* Role-personalised greeting */}
          <p
            className="mt-2 text-sm font-medium sm:text-base"
            style={{ color: C.lavender }}
          >
            {firstName ? `${firstName}, ` : ''}{ROLE_MSG[role]}
          </p>

          {/* Gold divider */}
          <div
            className="my-4 h-px w-16"
            style={{
              background: `linear-gradient(to right, ${C.pink}, ${C.lavender}, transparent)`,
            }}
          />

          {/* Tagline */}
          <p
            className="mb-4 text-sm font-semibold italic"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            Connecting Students, Universities and Industry Through Technology.
          </p>

          {/* Typing description */}
          <div
            className="max-h-48 overflow-y-auto rounded-xl p-4 text-xs leading-relaxed sm:text-sm"
            style={{
              background: 'rgba(0,0,0,0.35)',
              border: `1px solid ${C.border}`,
              color: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {displayed}
            {!done && (
              <span
                className="ml-0.5 inline-block h-[1em] w-[2px] align-middle"
                style={{
                  background: C.pink,
                  animation: reduced ? 'none' : 'leap-cursor-blink 0.9s step-start infinite',
                }}
                aria-hidden
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Global keyframes injected once ── */}
      <style>{`
        @keyframes leap-spin-globe {
          from { transform: perspective(600px) rotateY(0deg) scale(1); }
          to   { transform: perspective(600px) rotateY(360deg) scale(1); }
        }
        @keyframes leap-orbit-1 {
          from { transform: rotateX(75deg) rotateZ(0deg); }
          to   { transform: rotateX(75deg) rotateZ(360deg); }
        }
        @keyframes leap-orbit-2 {
          from { transform: rotateX(65deg) rotateZ(0deg) rotateY(40deg); }
          to   { transform: rotateX(65deg) rotateZ(-360deg) rotateY(40deg); }
        }
        @keyframes leap-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes leap-cursor-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes leap-particle-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.6;  transform: scale(1.6); }
        }
      `}</style>
    </section>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GridPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(${C.grid} 1px, transparent 1px),
          linear-gradient(90deg, ${C.grid} 1px, transparent 1px)
        `,
        backgroundSize: '36px 36px',
      }}
    />
  )
}

function Particles({ reduced }: { reduced: boolean }) {
  if (reduced) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.r * 2}px`,
            height: `${p.r * 2}px`,
            background: p.id % 3 === 0 ? C.pink : C.lavender,
            animation: `leap-particle-pulse ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function OrbitalRings({ reduced }: { reduced: boolean }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    inset: '0',
    borderRadius: '50%',
    border: `1px solid`,
    pointerEvents: 'none',
  }
  return (
    <>
      <div
        style={{
          ...base,
          borderColor: `${C.pink}55`,
          animation: reduced ? 'none' : `leap-orbit-1 12s linear infinite`,
        }}
      />
      <div
        style={{
          ...base,
          inset: '-8%',
          borderColor: `${C.lavender}44`,
          animation: reduced ? 'none' : `leap-orbit-2 18s linear infinite`,
        }}
      />
      {/* Two small dot accents on the ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 8, height: 8,
          background: C.pink,
          top: '50%', left: '-5%',
          boxShadow: `0 0 10px ${C.pink}`,
          transform: 'translateY(-50%)',
        }}
        aria-hidden
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 5, height: 5,
          background: '#fff',
          top: '50%', right: '-4%',
          transform: 'translateY(-50%)',
          opacity: 0.7,
        }}
        aria-hidden
      />
    </>
  )
}

function AnimatedGlobe({ reduced }: { reduced: boolean }) {
  return (
    <div
      className="relative z-10 overflow-hidden rounded-full"
      style={{
        width: '72%',
        height: '72%',
        boxShadow: `
          0 0 0 1px ${C.border},
          0 0 40px ${C.purple}99,
          0 0 80px ${C.pink}22,
          inset 0 0 30px rgba(0,0,0,0.4)
        `,
        animation: reduced ? 'none' : 'leap-spin-globe 20s linear infinite',
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    >
      <img
        src="/globe.jpg"
        alt="Limkokwing University globe showing international flags"
        className="h-full w-full object-cover"
        draggable={false}
        style={{
          filter: 'brightness(0.95) contrast(1.08) saturate(1.1)',
        }}
      />
      {/* Specular highlight overlay for 3-D depth */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.18) 0%, transparent 55%)',
        }}
      />
    </div>
  )
}

function FloatingIconCard({
  Icon,
  label,
  delay,
  pos,
  reduced,
}: {
  Icon: React.ElementType
  label: string
  delay: string
  pos: string
  reduced: boolean
}) {
  return (
    <div
      title={label}
      className={`absolute z-20 flex h-11 w-11 items-center justify-center rounded-2xl ${pos}`}
      aria-label={label}
      style={{
        background: C.iconBg,
        border: `1px solid ${C.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 12px ${C.lavender}22`,
        backdropFilter: 'blur(8px)',
        animation: reduced ? 'none' : `leap-float 3.2s ease-in-out ${delay} infinite`,
      }}
    >
      <Icon size={20} style={{ color: C.pink }} strokeWidth={1.6} />
    </div>
  )
}
