"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

export default function LoginPageForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-light mb-4">
            <BookOpen className="w-5 h-5 text-accent" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            TutorFlow
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
