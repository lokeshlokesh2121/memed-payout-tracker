"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "../../lib/api";

type Campaign = {
  _id: string;
  title: string;
  description?: string;
  budget: number;
  payoutPerThousandViews: number;
};

type CampaignResponse = {
  campaigns?: Campaign[];
  data?: Campaign[];
  message?: string;
};

export default function BrandDashboardPage() {
  const router = useRouter();

  const [name, setName] = useState("Brand");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadCampaigns = useCallback(async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (role !== "brand") {
      router.replace(
        role === "creator" ? "/creator/dashboard" : "/login"
      );
      return;
    }

    const savedName = localStorage.getItem("name");
    if (savedName) {
      setName(savedName);
    }

    setError("");

    try {
      const result = await apiRequest<CampaignResponse | Campaign[]>(
        "/campaigns",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const list = Array.isArray(result)
        ? result
        : result.campaigns ?? result.data ?? [];

      setCampaigns(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load campaigns."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    router.replace("/login");
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadCampaigns();
  }

  const totalBudget = campaigns.reduce(
    (total, campaign) => total + (campaign.budget || 0),
    0
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
          <p className="mt-4 text-slate-300">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold">
            Meme&apos;d{" "}
            <span className="text-violet-400">Payout</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-300 sm:inline">
              Welcome, {name}
            </span>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold tracking-widest text-violet-400">
              BRAND WORKSPACE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Brand Dashboard
            </h1>

            <p className="mt-2 text-slate-400">
              Manage campaigns and track your creator partnerships.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/brand/campaigns/create")}
            className="rounded-xl bg-violet-600 px-5 py-3 font-semibold transition hover:bg-violet-500"
          >
            + Create Campaign
          </button>
        </div>

        {/* Dashboard statistics */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-400">
              Total Campaigns
            </p>

            <p className="mt-3 text-3xl font-bold">
              {campaigns.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-400">
              Combined Campaign Budget
            </p>

            <p className="mt-3 text-3xl font-bold">
              ₹{totalBudget.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-400">
              Account Type
            </p>

            <p className="mt-3 text-3xl font-bold">
              Brand
            </p>
          </div>
        </section>

        {/* Campaign list */}
        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Your Campaigns
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                View campaign details and manage creator submissions.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-violet-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "↻ Refresh campaigns"}
            </button>
          </div>

          {/* Error state */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
            >
              <p className="font-semibold">
                Unable to load campaigns
              </p>

              <p className="mt-1">{error}</p>

              <p className="mt-2 text-xs text-slate-400">
                Check that your backend is running and the campaign
                endpoint matches your backend routes.
              </p>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 font-medium text-red-200 transition hover:bg-red-500/25 disabled:opacity-60"
              >
                {refreshing ? "Retrying..." : "Try again"}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!error && campaigns.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl">
                +
              </div>

              <h3 className="mt-4 text-lg font-semibold">
                No campaigns yet
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Create your first campaign to start working with creators.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/brand/campaigns/create")
                }
                className="mt-5 rounded-lg bg-violet-600 px-5 py-2.5 font-medium transition hover:bg-violet-500"
              >
                Create your first campaign
              </button>
            </div>
          )}

          {/* Campaign cards */}
          {!error && campaigns.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              {campaigns.map((campaign) => (
                <article
                  key={campaign._id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-violet-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold">
                        {campaign.title}
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">
                        {campaign.description ||
                          "No description provided."}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                      Campaign
                    </span>
                  </div>

                  {/* Budget and payout */}
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-900/70 p-4">
                      <p className="text-xs text-slate-400">
                        Total Budget
                      </p>

                      <p className="mt-2 break-words text-lg font-bold">
                        ₹{(campaign.budget || 0).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-900/70 p-4">
                      <p className="text-xs text-slate-400">
                        Payout / 1,000 Views
                      </p>

                      <p className="mt-2 break-words text-lg font-bold">
                        ₹
                        {(
                          campaign.payoutPerThousandViews || 0
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Campaign actions */}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/brand/campaigns/${campaign._id}/submissions`}
                      className="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-violet-500"
                    >
                      View Submissions →
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        router.push("/brand/campaigns/create")
                      }
                      className="inline-flex items-center rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Create Another Campaign
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}