"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(searchParams.get("error") ?? "");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    void (async () => {
      const result = await supabase.auth.getUser();
      setSignedInEmail(result.data.user?.email ?? null);
    })();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabaseConfigured) return;
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/redirect`,
            },
          });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "sign-up" && !result.data.session) {
      setMessage(
        "Check your inbox to confirm your email, then return to sign in.",
      );
      return;
    }
    setSignedInEmail(result.data.user?.email ?? email);
    router.replace("/auth/redirect");
  }

  async function signOut() {
    if (!supabaseConfigured) return;
    setBusy(true);
    const { error } = await createClient().auth.signOut();
    setBusy(false);
    if (error) return setMessage(error.message);
    setSignedInEmail(null);
    setMessage("You’ve been signed out.");
    router.replace("/auth");
  }

  return (
    <section className="auth-page section">
      <div className="auth-copy">
        <div className="eyebrow">SECURE ACCOUNT ACCESS</div>
        <h1>
          Your good things, <em>all in one place.</em>
        </h1>
        <p>
          Customer sign-up creates a verified Supabase account. Merchant, rider,
          and administrator access is granted from protected workflows, never
          from this form.
        </p>
      </div>
      <div className="panel auth-card">
        {!supabaseConfigured ? (
          <>
            <span className="status">SETUP REQUIRED</span>
            <h2>Connect Supabase to sign in</h2>
            <p>
              Add the public Supabase URL and publishable key from{" "}
              <code>.env.example</code>. This build keeps Phase 1 demo data
              available locally until a project is configured.
            </p>
          </>
        ) : signedInEmail ? (
          <>
            <span className="status">SIGNED IN</span>
            <h2>Welcome back.</h2>
            <p>{signedInEmail}</p>
            <button className="btn dark" onClick={signOut} disabled={busy}>
              <LogOut size={16} /> Sign out
            </button>
          </>
        ) : (
          <>
            <div
              className="auth-tabs"
              role="tablist"
              aria-label="Account access"
            >
              <button
                role="tab"
                aria-selected={mode === "sign-in"}
                className={mode === "sign-in" ? "active" : ""}
                onClick={() => setMode("sign-in")}
              >
                Sign in
              </button>
              <button
                role="tab"
                aria-selected={mode === "sign-up"}
                className={mode === "sign-up" ? "active" : ""}
                onClick={() => setMode("sign-up")}
              >
                Create account
              </button>
            </div>
            <h2>
              {mode === "sign-in" ? "Welcome back." : "Let’s make it official."}
            </h2>
            <form onSubmit={submit} className="auth-form">
              <label className="field">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                Password
                <input
                  type="password"
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className="btn dark" disabled={busy}>
                {busy
                  ? "Just a moment…"
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create secure account"}
                {!busy && <ArrowUpRight size={16} />}
              </button>
            </form>
          </>
        )}
        {message && (
          <p className="auth-message" role="status">
            <Check size={16} /> {message}
          </p>
        )}
      </div>
    </section>
  );
}
