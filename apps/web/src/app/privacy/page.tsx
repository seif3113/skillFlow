import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 md:p-24 selection:bg-sky-500/30">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to SkillFlow
        </Link>

        <h1 className="text-4xl font-black tracking-tight mb-8">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">
              1. Data Collection
            </h2>
            <p>
              SkillFlow collects basic profile information through Google OAuth,
              including your name and email address, to provide a personalized
              experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">
              2. Usage of Data
            </h2>
            <p>
              Your data is used to save your learning roadmaps, track your
              progress, and improve our AI generation algorithms. We do not sell
              your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">
              3. Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your
              information. However, no method of transmission over the internet
              is 100% secure.
            </p>
          </section>

          <p className="text-sm pt-12 border-t border-zinc-900">
            Last updated: June 17, 2026
          </p>
        </div>
      </div>
    </div>
  );
}
