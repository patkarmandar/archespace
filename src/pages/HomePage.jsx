import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  Server,
  ShieldCheck,
  Sparkles,
  GitFork,
  CheckCircle2,
} from 'lucide-react'

function GithubMark({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.27-5.23-5.67 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18.92-.26 1.9-.38 2.88-.39.98.01 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.64 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

const privacyPoints = [
  'Client-side encryption for saved spaces and items',
  'Vault PIN stays separate from the login password',
  'One-time recovery code if you ever forget your PIN',
]

const heroWords = ['Arche', 'Encrypted', 'Private', 'Own']

export default function HomePage() {
  const [heroWordIndex, setHeroWordIndex] = useState(0)
  const heroWord = heroWords[heroWordIndex]

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroWordIndex(index => (index + 1) % heroWords.length)
    }, 3500)

    return () => window.clearInterval(interval)
  }, [])

  const handlePointerMove = (event) => {
    event.currentTarget.style.setProperty('--home-cursor-x', `${event.clientX}px`)
    event.currentTarget.style.setProperty('--home-cursor-y', `${event.clientY}px`)
  }

  const handlePointerLeave = (event) => {
    event.currentTarget.style.setProperty('--home-cursor-x', '50vw')
    event.currentTarget.style.setProperty('--home-cursor-y', '42vh')
  }

  return (
    <main
      className="home-page min-h-screen bg-[#0f1117] text-white overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <section className="relative h-[100svh] overflow-hidden px-4 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(50,211,170,0.18),transparent_28%),radial-gradient(circle_at_80%_16%,rgba(124,106,247,0.18),transparent_30%),linear-gradient(135deg,#0f1117_0%,#171923_46%,#11221f_100%)]" />
        <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />

        <div className="absolute inset-0 pointer-events-none">
          <div className="home-float absolute top-[16%] left-[5%] hidden md:block w-56 rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-md p-4 shadow-2xl">
            <div className="flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 size={14} />
              Draft ideas
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-2.5 w-5/6 rounded-full bg-white/30" />
              <div className="h-2.5 w-2/3 rounded-full bg-white/15" />
              <div className="h-2.5 w-3/4 rounded-full bg-emerald-300/30" />
            </div>
          </div>

          <div className="home-float-delayed absolute top-[24%] right-[6%] hidden lg:block w-64 rounded-xl border border-white/10 bg-[#171923]/80 backdrop-blur-md p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Launch plan</span>
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-cyan-300/15 border border-cyan-200/20 p-3">
                <div className="h-2 w-12 rounded-full bg-cyan-200/50" />
                <div className="mt-2 h-8 rounded bg-white/10" />
              </div>
              <div className="rounded-lg bg-violet-300/15 border border-violet-200/20 p-3">
                <div className="h-2 w-10 rounded-full bg-violet-200/50" />
                <div className="mt-2 h-8 rounded bg-white/10" />
              </div>
            </div>
          </div>
        </div>

        <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10">
              <Sparkles size={18} className="text-emerald-200" />
            </span>
            <span className="text-sm font-semibold tracking-wide">Arche Space</span>
          </Link>

          <nav className="flex items-center gap-2">
            <a
              href="https://github.com/patkarmandar/Arche"
              target="_blank"
              rel="noreferrer"
              className="home-link-lift hidden sm:inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15 hover:text-white transition-colors"
            >
              <GithubMark size={15} />
              GitHub
            </a>
            <Link
              to="/login"
              className="home-link-lift inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-[#10201c] hover:bg-emerald-200 transition-colors"
            >
              Sign in
              <ArrowRight size={15} />
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-1 pt-20 pb-10 text-center sm:pt-24 sm:pb-12">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
            <ShieldCheck size={14} />
            Encrypted private space
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
            Your{' '}
            <span
              key={heroWord}
              className="home-word inline-block text-cyan-200 drop-shadow-[0_0_22px_rgba(103,232,249,0.3)]"
            >
              {heroWord}
            </span>{' '}
            Space
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
            An open-source, private, encrypted space for organizing notes, checklists, cards, and more without giving anyone else a window into your work.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="home-link-lift inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 py-3 text-sm font-semibold text-[#10201c] shadow-lg shadow-emerald-950/40 hover:bg-emerald-200 transition-colors"
            >
              Open the app
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://github.com/patkarmandar/Arche"
              target="_blank"
              rel="noreferrer"
              className="home-link-lift inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <GithubMark size={16} />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[#101820] px-4 py-20 text-white sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-emerald-200">Privacy highlight</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">
              Private enough that developers cannot read your saved data.
            </h2>
            <p className="mt-5 text-base leading-7 text-white/68">
              Arche Space is built around encrypted vault storage. Your saved spaces and items are protected before they are stored, so the application owner and developers do not get readable access to your private content.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
            <div className="space-y-3">
              {privacyPoints.map(point => (
                <div key={point} className="flex items-start gap-3 rounded-lg bg-white/[0.06] p-4">
                  <LockKeyhole size={17} className="mt-0.5 shrink-0 text-emerald-200" />
                  <span className="text-sm leading-6 text-white/78">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0f1117] px-4 py-20 text-white sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <article className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="flex items-center gap-3">
              <Server size={24} className="shrink-0 text-emerald-200" />
              <h2 className="text-xl font-semibold">Self-host friendly</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/68">
              Run Arche Space for yourself with single-user mode enabled, or configure sign-up for a small private group.
            </p>
          </article>
          <article className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="flex items-center gap-3">
              <GitFork size={24} className="shrink-0 text-emerald-200" />
              <h2 className="text-xl font-semibold">Open source</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/68">
              The code is open for anyone to inspect, audit, or contribute to on GitHub.
            </p>
          </article>
          <article className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="flex items-center gap-3">
              <Mail size={24} className="shrink-0 text-emerald-200" />
              <h2 className="text-xl font-semibold">Contact</h2>
            </div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-white/68">
              <p>
                Need help with setup, login, recovery, or self-hosting? Write to <a className="font-semibold text-emerald-200 hover:underline" href="mailto:help@archespace.cc">help@archespace.cc</a>.
              </p>
              <p>
                Have a feature request, bug report, or note for the developers? Send it to <a className="font-semibold text-emerald-200 hover:underline" href="mailto:dev@archespace.cc">dev@archespace.cc</a>.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-[#12141b] px-4 py-16 text-center text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-normal">A quiet place for everything you are shaping.</h2>
          <p className="mt-4 text-sm leading-6 text-white/65">
            Keep the rough draft, the list, the plan, the memory, and the next move in one encrypted space.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/login"
              className="home-link-lift inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 py-3 text-sm font-semibold text-[#10201c] hover:bg-emerald-200 transition-colors"
            >
              Sign in to Arche Space
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
