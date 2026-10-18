
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between border-b border-white/10 px-6 py-5 md:px-12">
        <Link href="/" className="text-xl font-bold">
          Meme'd<span className="text-violet-400">Payout</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-slate-300 hover:text-white"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-28 text-center">
        <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm text-violet-300">
          Creator Campaigns & Payouts
        </span>

        <h1 className="mt-8 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
          Campaigns made simple.
          <span className="block text-violet-400">
            Payouts made transparent.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
          Connect brands and creators, manage campaigns, track post
          performance, and keep payouts organized in one place.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-xl bg-violet-600 px-7 py-3 font-semibold hover:bg-violet-500"
          >
            Start for Free →
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-white/15 px-7 py-3 font-semibold hover:bg-white/5"
          >
            Sign In
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        <FeatureCard
          title="Campaign Management"
          description="Create campaigns, set budgets, and manage creator participation."
        />

        <FeatureCard
          title="Post Tracking"
          description="Submit post URLs, review submissions, and track approved views."
        />

        <FeatureCard
          title="Payout Transparency"
          description="Estimate earnings, reserve budgets, and review payout history."
        />
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-slate-400">{description}</p>
    </div>
  );
}
