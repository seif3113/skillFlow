import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      background: 'radial-gradient(ellipse at top right, rgba(14, 165, 233, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(20, 184, 166, 0.15) 0%, transparent 50%)',
    }} className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
        <div
            className="inline-flex items-center justify-center rounded-2xl"
          >
            <Image src="/favicon.svg" alt="SkillFlow Logo" width={50} height={50} />
          </div>
          <span className="text-zinc-100 font-bold text-xl tracking-tight">SkillFlow</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-zinc-100 tracking-tight leading-tight">
            Master any skill,
            <br />
            <span className="text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8 0%, #2dd4bf 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
              with AI guidance
            </span>
          </h1>

          <p className="mt-6 text-lg text-zinc-400 max-w-md mx-auto">
            SkillFlow generates personalized learning roadmaps tailored to your goals. From beginner to expert, chart your path to mastery.
          </p>

          <div className="mt-10">
            <Link href="/signin">
              <button
                className="px-8 py-3.5 rounded-xl text-white font-bold text-base transition-all hover:scale-105 active:scale-100 shadow-lg shadow-sky-500/20"
                style={{ background: 'linear-gradient(90deg, #0284c7 0%, #0d9488 100%)' }}
              >
                Start Learning — It&apos;s Free
              </button>
            </Link>
          </div>

          {/* Minimal feature hints */}
          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-zinc-500">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Smart Generation
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Personalized Path
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Track Progress
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-zinc-700 text-xs">
        &copy; {new Date().getFullYear()} SkillFlow. All rights reserved.
      </footer>
    </div>
  );
}
