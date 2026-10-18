"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "../../lib/api";

type EarningsSummary = {
  totalPosts: number;
  approvedPosts: number;
  pendingPosts: number;
  rejectedPosts: number;
  totalViews: number;
  estimatedEarnings: number;
};

type EarningsResponse = {
  success: boolean;
  summary: EarningsSummary;
};

const initialSummary: EarningsSummary = {
  totalPosts: 0,
  approvedPosts: 0,
  pendingPosts: 0,
  rejectedPosts: 0,
  totalViews: 0,
  estimatedEarnings: 0,
};

export default function CreatorDashboard() {
  const router = useRouter();

  const [name, setName] = useState("Creator");
  const [summary, setSummary] =
    useState<EarningsSummary>(initialSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const savedName = localStorage.getItem("name");

    if (!token || role !== "creator") {
      router.replace("/login");
      return;
    }

    if (savedName) {
      setName(savedName);
    }

    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const result = await apiRequest<EarningsResponse>(
          "/posts/creator/earnings",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!cancelled) {
          if (result.summary) {
            setSummary({
              totalPosts: result.summary.totalPosts ?? 0,
              approvedPosts: result.summary.approvedPosts ?? 0,
              pendingPosts: result.summary.pendingPosts ?? 0,
              rejectedPosts: result.summary.rejectedPosts ?? 0,
              totalViews: result.summary.totalViews ?? 0,
              estimatedEarnings:
                result.summary.estimatedEarnings ?? 0,
            });
          } else {
            setError("The server did not return earnings summary data.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load your dashboard."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    router.replace("/login");
  }

  const cards = [
    {
      title: "Total Submissions",
      value: summary.totalPosts.toLocaleString("en-IN"),
      description: "All submitted posts",
    },
    {
      title: "Approved Posts",
      value: summary.approvedPosts.toLocaleString("en-IN"),
      description: "Posts approved by brands",
    },
    {
      title: "Total Views",
      value: summary.totalViews.toLocaleString("en-IN"),
      description: "Views on approved posts",
    },
    {
      title: "Estimated Earnings",
      value: `₹${summary.estimatedEarnings.toLocaleString("en-IN")}`,
      description: "Based on eligible post views",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/creator/dashboard"
            className="text-xl font-bold"
          >
            Meme&apos;d{" "}
            <span className="text-purple-400">Payout</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-300 sm:block">
              Welcome, {name}
            </span>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/10 px-5 py-2 transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-purple-400">
          Creator Workspace
        </p>

        <h1 className="text-3xl font-bold">
          Creator Dashboard
        </h1>

        <p className="mt-2 text-slate-400">
          Discover campaigns, submit posts, and track your earnings.
        </p>

        {/* Navigation */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/creator/campaigns"
            className="rounded-lg bg-purple-600 px-5 py-3 font-semibold transition hover:bg-purple-500"
          >
            Browse Campaigns
          </Link>

          <Link
            href="/creator/submissions"
            className="rounded-lg border border-white/10 px-5 py-3 font-semibold transition hover:bg-white/10"
          >
            My Submissions
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-10 rounded-xl border border-white/10 bg-slate-900 p-6">
            <p className="animate-pulse text-slate-400">
              Loading your dashboard...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
            <h2 className="font-semibold text-red-300">
              Unable to load earnings
            </h2>

            <p className="mt-2 break-words text-sm text-red-200">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold transition hover:bg-red-500/30"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Dashboard cards */}
        {!loading && !error && (
          <>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-6 transition hover:border-purple-500/40"
                >
                  <p className="text-sm text-slate-400">
                    {card.title}
                  </p>

                  <p className="mt-4 break-words text-3xl font-bold">
                    {card.value}
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Submission summary */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">
                Submission Summary
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">
                    Pending
                  </p>
                  <p className="mt-2 text-2xl font-bold text-yellow-400">
                    {summary.pendingPosts}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">
                    Approved
                  </p>
                  <p className="mt-2 text-2xl font-bold text-green-400">
                    {summary.approvedPosts}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">
                    Rejected
                  </p>
                  <p className="mt-2 text-2xl font-bold text-red-400">
                    {summary.rejectedPosts}
                  </p>
                </div>
              </div>
            </div>

            {/* Empty state */}
            {summary.totalPosts === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-white/20 p-8 text-center">
                <h2 className="text-xl font-semibold">
                  No submissions yet
                </h2>

                <p className="mt-2 text-slate-400">
                  Join a campaign and submit your first social-media post
                  to start tracking your performance.
                </p>

                <Link
                  href="/creator/campaigns"
                  className="mt-5 inline-block rounded-lg bg-purple-600 px-5 py-3 font-semibold transition hover:bg-purple-500"
                >
                  Explore Campaigns
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
