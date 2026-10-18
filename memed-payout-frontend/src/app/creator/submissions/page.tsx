
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";

type Submission = {
  postId: string;
  campaignTitle: string;
  postUrl: string;
  views: number;
  status: string;
  estimatedPayout: number;
  submittedAt?: string;
};

type EarningsResponse = {
  success: boolean;
  earnings?: Submission[];
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

export default function CreatorSubmissionsPage() {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (role !== "creator") {
      router.replace("/");
      return;
    }

    async function loadSubmissions() {
      try {
        setError("");

        const data = await apiRequest<EarningsResponse>(
          "/posts/creator/earnings",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setSubmissions(data.earnings ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load submissions."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSubmissions();
  }, [router]);

  const totalViews = submissions.reduce(
    (total, item) => total + Number(item.views ?? 0),
    0
  );

  const totalEstimatedPayout = submissions.reduce(
    (total, item) =>
      total + Number(item.estimatedPayout ?? 0),
    0
  );

  const approvedCount = submissions.filter(
    (item) => item.status?.toLowerCase() === "approved"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <header className="border-b border-white/10 bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/creator/dashboard"
            className="text-xl font-extrabold tracking-tight"
          >
            Meme&apos;d{" "}
            <span className="text-violet-400">Payout</span>
          </Link>

          <Link
            href="/creator/dashboard"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-violet-500/50 hover:bg-white/5 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        {/* Page heading */}
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
              Creator Workspace
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              My Submissions
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Track your published posts, monitor views, and
              keep an eye on your estimated earnings.
            </p>
          </div>

          <Link
            href="/creator/campaigns"
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
          >
            Browse Campaigns
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        </section>

        {/* Summary cards */}
        {!loading && !error && (
          <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Submissions"
              value={submissions.length.toLocaleString("en-IN")}
              detail="All submitted posts"
            />

            <SummaryCard
              label="Total Views"
              value={totalViews.toLocaleString("en-IN")}
              detail="Views across your posts"
            />

            <SummaryCard
              label="Approved Posts"
              value={approvedCount.toLocaleString("en-IN")}
              detail="Submissions approved"
            />

            <SummaryCard
              label="Estimated Earnings"
              value={formatCurrency(totalEstimatedPayout)}
              detail="Based on current estimates"
              highlight
            />
          </section>
        )}

        {/* Submission history */}
        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                Submission History
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Review the status and estimated payout for each post.
              </p>
            </div>

            {!loading && !error && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                {submissions.length}{" "}
                {submissions.length === 1
                  ? "submission"
                  : "submissions"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500" />

              <p className="mt-4 text-sm text-slate-400">
                Loading your submissions...
              </p>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6"
            >
              <h3 className="font-semibold text-red-300">
                Unable to load submissions
              </h3>

              <p className="mt-2 text-sm text-red-200/80">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10"
              >
                Try Again
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-2xl text-violet-300">
                ↗
              </div>

              <h3 className="mt-5 text-lg font-bold">
                No submissions yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Once you join a campaign and submit a post,
                your submission history and estimated earnings
                will appear here.
              </p>

              <Link
                href="/creator/campaigns"
                className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold transition hover:bg-violet-500"
              >
                Explore Campaigns
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl shadow-black/10 md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-white/10 bg-white/[0.04]">
                      <tr className="text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-5 font-semibold">
                          Campaign
                        </th>
                        <th className="px-6 py-5 font-semibold">
                          Post
                        </th>
                        <th className="px-6 py-5 font-semibold">
                          Views
                        </th>
                        <th className="px-6 py-5 font-semibold">
                          Status
                        </th>
                        <th className="px-6 py-5 text-right font-semibold">
                          Estimated Payout
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/[0.07]">
                      {submissions.map((item) => (
                        <tr
                          key={item.postId}
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-5">
                            <p className="max-w-[240px] truncate font-semibold text-white">
                              {item.campaignTitle || "Campaign"}
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <a
                              href={item.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 font-medium text-violet-300 transition hover:text-violet-200 hover:underline"
                            >
                              Open Post
                              <span aria-hidden="true">↗</span>
                            </a>
                          </td>

                          <td className="px-6 py-5 font-medium tabular-nums text-slate-200">
                            {Number(item.views ?? 0).toLocaleString("en-IN")}
                          </td>

                          <td className="px-6 py-5">
                            <StatusBadge status={item.status} />
                          </td>

                          <td className="px-6 py-5 text-right font-bold tabular-nums text-emerald-300">
                            {formatCurrency(
                              Number(item.estimatedPayout ?? 0)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-4 md:hidden">
                {submissions.map((item) => (
                  <article
                    key={item.postId}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Campaign
                        </p>

                        <h3 className="mt-1 break-words font-bold text-white">
                          {item.campaignTitle || "Campaign"}
                        </h3>
                      </div>

                      <StatusBadge status={item.status} />
                    </div>

                    <a
                      href={item.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200 hover:underline"
                    >
                      Open Post <span aria-hidden="true">↗</span>
                    </a>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-950/70 p-4">
                        <p className="text-xs text-slate-400">
                          Views
                        </p>

                        <p className="mt-2 text-lg font-bold tabular-nums">
                          {Number(item.views ?? 0).toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-950/70 p-4">
                        <p className="text-xs text-slate-400">
                          Estimated Payout 
                        </p>

                        <p className="mt-2 break-words text-lg font-bold text-emerald-300">
                          {formatCurrency(
                            Number(item.estimatedPayout ?? 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <footer className="mt-12 border-t border-white/10 pt-5 text-center text-xs text-slate-500">
          Meme&apos;d Payout · Creator Workspace
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-violet-500/30">
      <p className="text-sm font-medium text-slate-400">
        {label}
      </p>

      <p
        className={`mt-3 break-words text-2xl font-extrabold tracking-tight ${
          highlight ? "text-violet-300" : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || "pending";

  const styles =
    normalized === "approved"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : normalized === "rejected"
        ? "border-red-500/20 bg-red-500/10 text-red-300"
        : "border-amber-500/20 bg-amber-500/10 text-amber-300";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
}
