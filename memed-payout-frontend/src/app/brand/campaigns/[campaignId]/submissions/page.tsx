
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "../../../../lib/api";

type Submission = {
  _id: string;
  creatorId: string;
  postUrl: string;
  views: number;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  payoutReserved?: boolean;
  payoutStatus?: string;
};

type SubmissionsResponse = {
  posts?: Submission[];
  data?: Submission[];
  message?: string;
};

type Payout = {
  postId: string;
  campaignId: string;
  views: number;
  ratePerThousandViews: number;
  estimatedPayout: number;
};

type PayoutResponse = {
  success: boolean;
  payout: Payout;
};

type UpdateViewsResponse = {
  success: boolean;
  message: string;
  post?: {
    id?: string;
    views: number;
    status: string;
    campaignId: string;
  };
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

export default function BrandSubmissionsPage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;
  const router = useRouter();

  const [posts, setPosts] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [savingViewsId, setSavingViewsId] = useState("");
  const [viewInputs, setViewInputs] = useState<Record<string, string>>({});
  const [payouts, setPayouts] = useState<Record<string, Payout>>({});
  const [loadingPayouts, setLoadingPayouts] = useState<
    Record<string, boolean>
  >({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadPayout(postId: string, token: string) {
    setLoadingPayouts((current) => ({
      ...current,
      [postId]: true,
    }));

    try {
      const result = await apiRequest<PayoutResponse>(
        `/posts/${postId}/payout`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPayouts((current) => ({
        ...current,
        [postId]: result.payout,
      }));
    } catch (err) {
      console.error(
        `Unable to load payout for post ${postId}:`,
        err
      );

      setPayouts((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
    } finally {
      setLoadingPayouts((current) => ({
        ...current,
        [postId]: false,
      }));
    }
  }

  const loadSubmissions = useCallback(async () => {
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

    setError("");

    try {
      const result = await apiRequest<
        SubmissionsResponse | Submission[]
      >(`/campaigns/${campaignId}/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const list: Submission[] = Array.isArray(result)
        ? result
        : result.posts ?? result.data ?? [];

      setPosts(list);

      // Initialize view inputs without overwriting unsaved edits.
      setViewInputs((previous) => {
        const next = { ...previous };

        for (const post of list) {
          if (next[post._id] === undefined) {
            next[post._id] = String(post.views ?? 0);
          }
        }

        return next;
      });

      // Remove old estimates for posts that are no longer approved.
      const approvedPosts = list.filter(
        (post) => post.status === "approved"
      );

      const approvedIds = new Set(
        approvedPosts.map((post) => post._id)
      );

      setPayouts((current) => {
        const next: Record<string, Payout> = {};

        for (const [id, payout] of Object.entries(current)) {
          if (approvedIds.has(id)) {
            next[id] = payout;
          }
        }

        return next;
      });

      // Fetch estimates for approved posts only.
      await Promise.all(
        approvedPosts.map((post) => loadPayout(post._id, token))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load submissions."
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  async function updateStatus(
    postId: string,
    status: "approved" | "rejected"
  ) {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${status} this submission?`
    );

    if (!confirmed) return;

    setUpdatingId(postId);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/posts/${postId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      setPosts((current) =>
        current.map((post) =>
          post._id === postId ? { ...post, status } : post
        )
      );

      if (status === "approved") {
        await loadPayout(postId, token);
      } else {
        setPayouts((current) => {
          const next = { ...current };
          delete next[postId];
          return next;
        });
      }

      setNotice(`Submission ${status} successfully.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update submission status."
      );
    } finally {
      setUpdatingId("");
    }
  }

  async function updateViews(postId: string) {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const post = posts.find((item) => item._id === postId);

    if (!post) {
      setError("Submission not found.");
      return;
    }

    if (post.status !== "approved") {
      setError("Only approved posts can have their views updated.");
      return;
    }

    if (
      post.payoutReserved === true ||
      post.payoutStatus === "reserved"
    ) {
      setError("Views cannot be changed after payout reservation.");
      return;
    }

    const rawViews = viewInputs[postId];

    if (rawViews === undefined || rawViews.trim() === "") {
      setError("Please enter a view count.");
      return;
    }

    const views = Number(rawViews);

    if (!Number.isSafeInteger(views) || views < 0) {
      setError("Views must be a non-negative whole number.");
      return;
    }

    if (views < (post.views ?? 0)) {
      setError("New views cannot be less than current views.");
      return;
    }

    if (views === (post.views ?? 0)) {
      setNotice("The view count has not changed.");
      setError("");
      return;
    }

    setSavingViewsId(postId);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest<UpdateViewsResponse>(
        `/posts/${postId}/views`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ views }),
        }
      );

      const savedViews = result.post?.views ?? views;

      setPosts((current) =>
        current.map((item) =>
          item._id === postId
            ? { ...item, views: savedViews }
            : item
        )
      );

      setViewInputs((current) => ({
        ...current,
        [postId]: String(savedViews),
      }));

      // Refresh the estimate using the latest saved views.
      await loadPayout(postId, token);

      setNotice(
        result.message || "Post views updated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update post views."
      );
    } finally {
      setSavingViewsId("");
    }
  }

  const pendingCount = posts.filter(
    (post) => post.status === "pending"
  ).length;

  const approvedCount = posts.filter(
    (post) => post.status === "approved"
  ).length;

  const rejectedCount = posts.filter(
    (post) => post.status === "rejected"
  ).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading submissions...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold">
            Meme&apos;d <span className="text-violet-400">Payout</span>
          </Link>

          <button
            type="button"
            onClick={() => router.push("/brand/dashboard")}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/brand/dashboard"
          className="text-sm text-violet-300 hover:text-white"
        >
          ← Back to campaigns
        </Link>

        <div className="mt-5">
          <p className="text-sm font-semibold tracking-widest text-violet-400">
            BRAND WORKSPACE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Campaign Submissions
          </h1>

          <p className="mt-2 break-all text-sm text-slate-400">
            Campaign ID: {campaignId}
          </p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Pending</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Approved</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Rejected</p>
            <p className="mt-2 text-3xl font-bold text-red-300">
              {rejectedCount}
            </p>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            {notice}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">
            Submitted Posts ({posts.length})
          </h2>

          <button
            type="button"
            onClick={() => void loadSubmissions()}
            disabled={savingViewsId !== "" || updatingId !== ""}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-violet-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {posts.length === 0 && !error ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <h3 className="text-lg font-semibold">
              No submissions yet
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Creator submissions for this campaign will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {posts.map((post) => {
              const isReserved =
                post.payoutReserved === true ||
                post.payoutStatus === "reserved";

              const payout = payouts[post._id];

              return (
                <article
                  key={post._id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Submitted Post</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Post ID: {post._id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        post.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : post.status === "rejected"
                            ? "bg-red-500/10 text-red-300"
                            : "bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {post.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs text-slate-400">Post URL</p>
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block break-all text-sm text-violet-300 underline hover:text-violet-200"
                    >
                      {post.postUrl}
                    </a>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-900/70 p-4">
                      <p className="text-xs text-slate-400">
                        Current Views
                      </p>
                      <p className="mt-2 text-xl font-bold">
                        {(post.views ?? 0).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-900/70 p-4">
                      <p className="text-xs text-slate-400">
                        Creator ID
                      </p>
                      <p className="mt-2 break-all text-sm font-medium">
                        {post.creatorId}
                      </p>
                    </div>
                  </div>

                  {post.createdAt && (
                    <p className="mt-4 text-xs text-slate-400">
                      Submitted:{" "}
                      {new Date(post.createdAt).toLocaleString("en-IN")}
                    </p>
                  )}

                  {/* Estimated payout for approved submissions */}
                  {post.status === "approved" && (
                    <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                      <p className="text-sm text-slate-400">
                        Estimated Payout
                      </p>

                      {loadingPayouts[post._id] ? (
                        <p className="mt-2 text-sm text-slate-300">
                          Calculating payout...
                        </p>
                      ) : payout ? (
                        <>
                          <p className="mt-2 text-2xl font-bold text-violet-300">
                            {formatCurrency(payout.estimatedPayout)}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            Rate:{" "}
                            {formatCurrency(
                              payout.ratePerThousandViews
                            )}{" "}
                            per 1,000 views
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Based on{" "}
                            {payout.views.toLocaleString("en-IN")}{" "}
                            verified views.
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">
                          Payout estimate is unavailable. Try Refresh.
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-500">
                        This is an estimate, not a completed payment.
                      </p>
                    </div>
                  )}

                  {post.status === "pending" && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={updatingId === post._id}
                        onClick={() =>
                          void updateStatus(post._id, "approved")
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === post._id
                          ? "Updating..."
                          : "Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={updatingId === post._id}
                        onClick={() =>
                          void updateStatus(post._id, "rejected")
                        }
                        className="rounded-lg bg-red-600/90 px-4 py-2.5 text-sm font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === post._id
                          ? "Updating..."
                          : "Reject"}
                      </button>
                    </div>
                  )}

                  {post.status === "approved" && (
                    <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/60 p-4">
                      <h4 className="font-semibold">
                        Update Verified Views
                      </h4>

                      <p className="mt-1 text-xs text-slate-400">
                        Enter the total current views, not the increase
                        since the last update.
                      </p>

                      <label
                        htmlFor={`views-${post._id}`}
                        className="mt-4 block text-sm text-slate-300"
                      >
                        Total views
                      </label>

                      <div className="mt-2 flex flex-wrap gap-3">
                        <input
                          id={`views-${post._id}`}
                          type="number"
                          min={post.views ?? 0}
                          max={Number.MAX_SAFE_INTEGER}
                          step="1"
                          value={
                            viewInputs[post._id] ??
                            String(post.views ?? 0)
                          }
                          onChange={(event) =>
                            setViewInputs((current) => ({
                              ...current,
                              [post._id]: event.target.value,
                            }))
                          }
                          disabled={
                            isReserved || savingViewsId !== ""
                          }
                          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />

                        <button
                          type="button"
                          onClick={() => void updateViews(post._id)}
                          disabled={
                            isReserved ||
                            savingViewsId !== "" ||
                            updatingId !== ""
                          }
                          className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingViewsId === post._id
                            ? "Saving..."
                            : "Save Views"}
                        </button>
                      </div>

                      {isReserved && (
                        <p className="mt-3 text-sm text-amber-300">
                          Views cannot be changed after payout reservation.
                        </p>
                      )}
                    </div>
                  )}

                  {post.status === "rejected" && (
                    <p className="mt-5 text-sm text-red-300">
                      This submission has been rejected.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
