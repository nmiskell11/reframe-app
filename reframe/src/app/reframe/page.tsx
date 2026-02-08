import { ReframeForm } from '@/components/reframe/ReframeForm'
import { Header } from '@/components/reframe/Header'

export const metadata = {
  title: 'reFrame - Say it better',
  description:
    'Transform emotionally charged messages into dignity-first communication. Break generational cycles. Model what you want to pass on.',
}

export default function ReframePage() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />

      {/* Hero */}
      <section className="bg-coral text-white text-center px-5 py-12 md:py-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          reFrame&trade;
        </h1>
        <p className="text-xl md:text-2xl mb-4">Say it better.</p>
        <p className="text-sm opacity-90 max-w-xl mx-auto leading-relaxed">
          Type what you really want to say. We&apos;ll show you how to express it with
          dignity &mdash; so you get your point across without damaging the relationship.
        </p>
      </section>

      {/* Form */}
      <section className="px-4 py-8 md:py-12 -mt-6">
        <ReframeForm />
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white px-5 py-10 text-center text-sm">
        <p className="font-bold text-base mb-2">reFrame&trade;</p>
        <p className="opacity-70 mb-1">
          Breaking generational cycles of dysfunction, one conversation at a time.
        </p>
        <p className="opacity-50 text-xs mt-4">
          &copy; 2026 wereFrame LLC. Patent Pending.
        </p>
      </footer>
    </div>
  )
}
