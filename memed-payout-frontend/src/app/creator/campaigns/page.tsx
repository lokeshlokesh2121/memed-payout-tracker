
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "../../lib/api";

interface Campaign {
  _id: string;
  title: string;
  description: string;
  budget: number;
  payoutPerThousandViews: number;
  creators?: string[];
  status?: "active" | "closed";
}

interface CampaignResponse {
  success: boolean;
  campaigns: Campaign[];
  message?: string;
}

interface JoinResponse {
  success?: boolean;
  message?: string;
}

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) return null;

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = atob(normalized);
    const user = JSON.parse(decoded);

    const userId =
      user.id ?? user.userId ?? user._id ?? user.sub;

    return userId ? String(userId) : null;
  } catch {
    return null;
  }
}

export default function CreatorCampaignsPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [joinedCampaigns, setJoinedCampaigns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCampaigns = useCallback(async () => {
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

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<CampaignResponse>(
        "/campaigns",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const fetchedCampaigns = response.campaigns ?? [];
      setCampaigns(fetchedCampaigns);

      const userId = getUserIdFromToken(token);

      if (userId) {
        const joinedIds = fetchedCampaigns
          .filter((campaign) =>
            (campaign.creators ?? []).some(
              (creatorId) => String(creatorId) === userId
            )
          )
          .map((campaign) => campaign._id);

        setJoinedCampaigns(joinedIds);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load campaigns. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  async function handleJoin(campaignId: string) {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    // Do not allow joining a campaign already marked closed.
    const selectedCampaign = campaigns.find(
      (campaign) => campaign._id === campaignId
    );

    if (selectedCampaign?.status === "closed") {
      setError("This campaign is closed and cannot be joined.");
      return;
    }

    setJoiningId(campaignId);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest<JoinResponse>(
        `/campaigns/${campaignId}/join`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setJoinedCampaigns((previous) =>
        previous.includes(campaignId)
          ? previous
          : [...previous, campaignId]
      );

      setNotice(response.message ?? "You have joined the campaign!");

      // Fetch the latest status from the backend.
      await loadCampaigns();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to join this campaign.";

      if (message.toLowerCase().includes("already")) {
        setJoinedCampaigns((previous) =>
          previous.includes(campaignId)
            ? previous
            : [...previous, campaignId]
        );
        setNotice(message);
      } else {
        setError(message);

        // A failed join may mean the campaign was just closed.
        await loadCampaigns();
      }
    } finally {
      setJoiningId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-300">Loading campaigns...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/creator/dashboard"
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-4 text-3xl font-bold">
              Browse Campaigns
            </h1>

            <p className="mt-2 text-slate-400">
              Discover campaigns, join them, and submit your posts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadCampaigns()}
              className="rounded-lg border border-slate-700 px-5 py-3 font-medium transition hover:bg-slate-800"
            >
              Refresh Campaigns
            </button>

            <Link
              href="/creator/submissions"
              className="rounded-lg border border-slate-700 px-5 py-3 text-center font-medium transition hover:bg-slate-800"
            >
              My Submissions
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-6 rounded-lg border border-green-800 bg-green-950 p-4 text-green-300">
            {notice}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h2 className="text-xl font-semibold">
              No campaigns available
            </h2>

            <p className="mt-2 text-slate-400">
              Please check again later.
            </p>

            <button
              type="button"
              onClick={() => void loadCampaigns()}
              className="mt-5 rounded-lg bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500"
            >
              Refresh Campaigns
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const joined = joinedCampaigns.includes(campaign._id);
              const joining = joiningId === campaign._id;
              const closed = campaign.status === "closed";

              return (
                <article
                  key={campaign._id}
                  className={`flex flex-col rounded-xl border bg-slate-900 p-6 shadow-lg ${
                    closed
                      ? "border-red-900/70"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex-1">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <h2 className="text-xl font-bold">
                        {campaign.title}
                      </h2>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          closed
                            ? "bg-red-900 text-red-300"
                            : joined
                              ? "bg-green-900 text-green-300"
                              : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {closed
                          ? "Closed"
                          : joined
                            ? "Joined"
                            : "Active"}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-slate-400">
                      {campaign.description}
                    </p>

                    <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
                      <div className="flex justify-between gap-3">
                        <span className="text-sm text-slate-400">
                          Campaign Budget
                        </span>

                        <span className="font-semibold">
                          ₹
                          {Number(campaign.budget).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-sm text-slate-400">
                          Payout per 1,000 views
                        </span>

                        <span className="font-semibold text-green-400">
                          ₹
                          {Number(
                            campaign.payoutPerThousandViews
                          ).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    {closed ? (
                      <div
                        aria-label="Campaign closed"
                        className="w-full cursor-not-allowed rounded-lg border border-red-800 bg-red-950 py-3 text-center font-semibold text-red-300"
                      >
                        Campaign Closed
                      </div>
                    ) : joined ? (
                      <Link
                        href={`/creator/campaigns/${campaign._id}/submit`}
                        className="block w-full rounded-lg bg-violet-600 py-3 text-center font-semibold transition hover:bg-violet-500"
                      >
                        Submit Post
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleJoin(campaign._id)}
                        disabled={joining}
                        className="w-full rounded-lg bg-violet-600 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {joining ? "Joining..." : "Join Campaign"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
