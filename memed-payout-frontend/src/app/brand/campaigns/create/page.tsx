
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "../../../lib/api";

export default function CreateCampaignPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [payoutPerThousandViews, setPayoutPerThousandViews] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const budgetValue = Number(budget);
  const payoutValue = Number(payoutPerThousandViews);

  const validBudget =
    budget.trim() !== "" &&
    Number.isFinite(budgetValue) &&
    budgetValue > 0;

  const validPayout =
    payoutPerThousandViews.trim() !== "" &&
    Number.isFinite(payoutValue) &&
    payoutValue > 0;

  const estimatedViews =
    validBudget && validPayout
      ? Math.floor((budgetValue / payoutValue) * 1000)
      : null;

  const estimatedViewsText =
    estimatedViews !== null
      ? new Intl.NumberFormat("en-IN").format(estimatedViews)
      : "";

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "brand") {
      router.replace("/login");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError("Please enter a campaign title and description.");
      return;
    }

    if (
      !Number.isFinite(budgetValue) ||
      !Number.isFinite(payoutValue) ||
      budgetValue <= 0 ||
      payoutValue <= 0
    ) {
      setError("Budget and payout must be greater than zero.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/campaigns", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          budget: budgetValue,
          payoutPerThousandViews: payoutValue,
        }),
      });

      router.replace("/brand/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the campaign."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/brand/dashboard"
          className="text-sm text-violet-300 hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            Brand Workspace
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Create a Campaign
          </h1>

          <p className="mt-2 text-slate-400">
            Set your campaign budget and reward creators based on their views.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium"
              >
                Campaign title
              </label>

              <input
                id="title"
                type="text"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer Product Launch"
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="description"
                required
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your campaign and what creators should promote..."
                className="w-full resize-y rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="budget"
                  className="mb-2 block text-sm font-medium"
                >
                  Total budget (₹)
                </label>

                <input
                  id="budget"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="10000"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label
                  htmlFor="payout"
                  className="mb-2 block text-sm font-medium"
                >
                  Payout per 1,000 views (₹)
                </label>

                <input
                  id="payout"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={payoutPerThousandViews}
                  onChange={(e) =>
                    setPayoutPerThousandViews(e.target.value)
                  }
                  placeholder="100"
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {validBudget && validPayout && (
              <section className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4">
                <h2 className="font-semibold text-violet-200">
                  Campaign estimate
                </h2>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-400">
                      Campaign budget
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatCurrency(budgetValue)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Estimated supported views
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {estimatedViewsText}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-300">
                  The campaign will automatically close when the combined
                  estimated payouts for approved posts reach or exceed the
                  campaign budget. Payout estimates depend on the approved
                  view counts.
                </p>
              </section>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating campaign..." : "Create Campaign"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
