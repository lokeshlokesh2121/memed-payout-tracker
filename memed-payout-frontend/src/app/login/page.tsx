
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";

type UserRole = "brand" | "creator";

type AuthResponse = {
  message?: string;
  token?: string;
  user?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    role?: UserRole;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiRequest<AuthResponse>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      if (!result.token) {
        throw new Error(
          "Login response did not contain a token. Please check your backend response."
        );
      }

      const role = result.user?.role;

      if (role !== "brand" && role !== "creator") {
        throw new Error(
          "User role is missing or invalid in the login response."
        );
      }

      // Save the authenticated user's session.
      localStorage.setItem("token", result.token);
      localStorage.setItem("role", role);

      if (result.user?.name) {
        localStorage.setItem("name", result.user.name);
      } else {
        localStorage.removeItem("name");
      }

      // Redirect according to the user's role.
      router.replace(
        role === "brand"
          ? "/brand/dashboard"
          : "/creator/dashboard"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <Link
          href="/"
          className="text-sm text-violet-300 transition hover:text-white"
        >
          ← Back to home
        </Link>

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            Meme'd Payout
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Welcome back
          </h1>

          <p className="mt-2 text-slate-400">
            Sign in to manage your campaigns and payouts.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-violet-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none transition placeholder:text-slate-500 focus:border-violet-500"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-violet-300 transition hover:text-white"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}