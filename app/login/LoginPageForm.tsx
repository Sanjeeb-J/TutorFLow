"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";
import Alert from "@/components/Alert";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light"
            aria-hidden="true"
          >
            <BookOpen className="h-6 w-6 text-accent" strokeWidth={2} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            TutorFlow
          </h1>
          <p className="mt-1 text-sm text-muted">A focused workspace for one-to-one tutoring</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && <Alert>{error}</Alert>}

            <div className="field">
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div className="field">
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input"
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary min-h-11 w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Tutors and students sign in to their own workspace.
        </p>
      </div>
    </div>
  );
}
