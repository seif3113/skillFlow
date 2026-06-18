import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 md:p-24 selection:bg-sky-500/30">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors mb-12 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to SkillFlow
        </Link>
        
        <h1 className="text-4xl font-black tracking-tight mb-8">Terms of Service</h1>
        
        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using SkillFlow, you agree to be bound by these terms. If you do not agree, please do not use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">2. AI Generated Content</h2>
            <p>SkillFlow provides AI-generated roadmaps. While we strive for accuracy, we do not guarantee the completeness or correctness of any learning paths or resources provided.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">3. User Conduct</h2>
            <p>You agree not to use SkillFlow for any unlawful purposes or to engage in any activity that disrupts the service for others.</p>
          </section>

          <p className="text-sm pt-12 border-t border-zinc-900">Last updated: June 17, 2026</p>
        </div>
      </div>
    </div>
  );
}
