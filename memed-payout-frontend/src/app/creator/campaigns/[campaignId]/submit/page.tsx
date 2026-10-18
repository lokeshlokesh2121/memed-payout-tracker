"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function SubmitPostPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;

  const [postUrl, setPostUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      // Define your backend URL. Fallback to localhost:5000 if env var is missing.
      const API_BASE_URL = "http://localhost:5000/api";
      
      // Use the full URL to prevent Next.js from intercepting it
      const response = await fetch(`${API_BASE_URL}/posts/${campaignId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postUrl }),
      });

      // Check if the response is HTML (which means the backend returned an error page)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error(
          "The backend returned an HTML error page instead of JSON. Check if your backend server is running and the route exists."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit post.");
      }

      setSuccess(
        data.message || "Post submitted successfully! It is pending review."
      );
      setPostUrl("");
      
      // Optional: Redirect after 2 seconds
      // setTimeout(() => router.push("/creator/submissions"), 2000);

    } catch (err: any) {
      setError(
        err.message || "Failed to submit post. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-xl">
        <Link
          href="/creator/campaigns"
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          ← Back to Campaigns
        </Link>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-bold">Submit a Post</h1>
          <p className="mt-2 text-sm text-slate-400">
            Paste the link to your published post to submit it for this campaign.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-950 p-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-lg bg-green-950 p-4 text-green-300 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="postUrl"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Post URL
              </label>
              <input
                id="postUrl"
                type="url"
                required
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://example.com/your-post"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Must be a direct link to the post (HTTP or HTTPS).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !postUrl}
              className="w-full rounded-lg bg-violet-600 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Post"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}