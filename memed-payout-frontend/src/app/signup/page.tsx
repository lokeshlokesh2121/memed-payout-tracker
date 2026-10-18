
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

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("creator");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function saveSession(
    result: AuthResponse,
    fallbackName: string,
    fallbackRole: UserRole
  ): UserRole {
    if (!result.token) {
      throw new Error(
        "Authentication succeeded, but no token was returned. Please check your backend response."
      );
    }

    const userRole = result.user?.role ?? fallbackRole;

    localStorage.setItem("token", result.token);
    localStorage.setItem("role", userRole);
    localStorage.setItem(
      "name",
      result.user?.name ?? fallbackName
    );

    return userRole;
  }

  function redirectToDashboard(userRole: UserRole) {
    router.replace(
      userRole === "brand"
        ? "/brand/dashboard"
        : "/creator/dashboard"
    );
  }

  async function handleSignup(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Create the account.
      const signupResult = await apiRequest<AuthResponse>(
        "/auth/signup",
        {
          method: "POST",
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password,
            role,
          }),
        }
      );

      // 2. If signup returns a token, go directly to the dashboard.
      if (signupResult.token) {
        const userRole = saveSession(
          signupResult,
          cleanName,
          role
        );

        redirectToDashboard(userRole);
        return;
      }

      // 3. Otherwise, automatically log in.
      const loginResult = await apiRequest<AuthResponse>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        }
      );

      // 4. Save the login token and redirect.
      const userRole = saveSession(
        loginResult,
        cleanName,
        role
      );

      redirectToDashboard(userRole);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <Link
          href="/"
          className="text-sm text-violet-300 hover:text-white"
        >
          ← Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          Create your account
        </h1>

        <p className="mt-2 text-slate-400">
          Join Meme'd Payout as a brand or creator.
        </p>

        <form onSubmit={handleSignup} className="mt-8 space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-2 block text-sm">
              I want to join as a
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as UserRole)
              }
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-violet-500"
            >
              <option value="creator">Creator</option>
              <option value="brand">Brand</option>
            </select>
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-violet-300 hover:text-white"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
