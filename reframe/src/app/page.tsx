import Link from 'next/link'
import { Header } from '@/components/reframe/Header'

export default function Home() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />

      {/* Hero */}
      <section className="bg-coral text-white text-center px-5 py-16 md:py-24">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
          reFrame&trade;
        </h1>
        <p className="text-2xl md:text-4xl mb-6">Say it better.</p>
        <p className="text-base md:text-lg opacity-90 max-w-xl mx-auto mb-2">
          Our only communication ally that catches toxic patterns before we hit send
          and shows us healthier alternatives.
        </p>
        <p className="text-sm opacity-80 mt-6">
          <strong>Built on the R&sup3; Framework&trade;:</strong> REGULATED &middot;
          RESPECTFUL &middot; REPAIRABLE
        </p>

        <Link
          href="/reframe"
          className="inline-block mt-8 px-10 py-4 bg-white text-coral rounded-xl text-lg font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          Try It Free
        </Link>
      </section>

      {/* How it works */}
      <section className="px-5 py-12 text-center max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-navy mb-8">How it works</h2>
        <div className="flex flex-col md:flex-row gap-8 justify-center">
          {[
            { step: '1', text: 'Pick your relationship type' },
            { step: '2', text: 'Type your raw, honest message' },
            { step: '3', text: 'Get a healthier version instantly' },
          ].map((s) => (
            <div key={s.step} className="flex-1">
              <div className="w-10 h-10 rounded-full bg-coral text-white font-bold flex items-center justify-center mx-auto mb-3 text-lg">
                {s.step}
              </div>
              <p className="text-sm text-neutral-700">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example card */}
      <section className="px-5 pb-12 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-2">
            <p className="text-xs font-bold uppercase text-red-500 mb-1">
              What you might type:
            </p>
            <p className="text-sm text-neutral-800">
              &ldquo;You never listen to me. You&apos;re so selfish and only care about
              yourself.&rdquo;
            </p>
          </div>
          <p className="text-center text-neutral-400 text-lg py-2">&darr;</p>
          <div className="bg-green-50 border-l-4 border-success rounded-lg p-4">
            <p className="text-xs font-bold uppercase text-success mb-1">
              What reFrame suggests:
            </p>
            <p className="text-sm text-neutral-800">
              &ldquo;I&apos;ve been feeling unheard lately. Can we talk about how we
              communicate when things get tense? I want us both to feel valued in this
              relationship.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white px-5 py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="font-bold text-base mb-2">reFrame&trade;</h3>
            <p className="opacity-70">
              Breaking generational cycles of dysfunction, one conversation at a time.
            </p>
            <p className="opacity-50 mt-2 italic">
              WE say it better, together.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-2">Core Principles</h3>
            <p className="opacity-70">Regulation over reaction</p>
            <p className="opacity-70">Dignity first</p>
            <p className="opacity-70">Disagreement &ne; hate</p>
            <p className="opacity-70">Repair is responsibility</p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-2">Get In Touch</h3>
            <p className="opacity-70">Questions? Feedback? Ideas?</p>
            <a href="mailto:info@wereframe.com" className="text-coral hover:underline">
              info@wereframe.com
            </a>
          </div>
        </div>
        <p className="text-center text-xs opacity-50 mt-8">
          &copy; 2026 wereFrame LLC. Patent Pending.
        </p>
      </footer>
    </div>
  )
}
