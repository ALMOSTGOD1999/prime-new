import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "../components/SiteLayout";
import { Wordmark } from "../components/Wordmark";
import { signup } from "../functions/auth/signup";
import { login } from "../functions/auth/login";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login or Sign Up — Prime Jewellery" },
      {
        name: "description",
        content:
          "Sign in to your Prime Jewellery account to track commissions, save collections and book boutique appointments.",
      },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "w-full border-b border-gold/40 bg-transparent py-3 text-sm outline-none transition-colors placeholder:text-emerald/40 focus:border-gold";

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check URL for referral code
  const searchParams = new URLSearchParams(window.location.search);
  const urlReferral = searchParams.get("ref") || "";

  useState(() => {
    if (urlReferral) {
      setReferralCode(urlReferral);
      setMode("signup");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const result = await signup({ data: { name, email, password, referralCode: referralCode || undefined } });
        // Set cookie from token
        document.cookie = `auth_token=${result.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        if (result.user?.isAdmin) {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/dashboard" });
        }
      } else {
        const result = await login({ data: { userId: email, password } });
        document.cookie = `auth_token=${result.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        if (result.user?.isAdmin) {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 pt-36 pb-24">
        <Wordmark className="mb-10 text-2xl font-bold uppercase" />
        <div className="mb-10 flex space-x-8 text-xs font-semibold uppercase tracking-widest">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`pb-1 transition-colors ${mode === "login" ? "border-b-2 border-gold text-gold" : "text-emerald/50"}`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`pb-1 transition-colors ${mode === "signup" ? "border-b-2 border-gold text-gold" : "text-emerald/50"}`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {urlReferral && mode === "signup" && (
          <div className="mb-6 rounded border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
            Joined via referral code: <strong>{urlReferral}</strong>
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              className={inputClass}
              placeholder="Full name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className={inputClass}
            placeholder="User ID or Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "signup" && (
            <input
              className={inputClass}
              placeholder="Referral code (optional)"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold px-8 py-3 text-xs font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "login" ? "Enter" : "Create Account"}
          </button>
        </form>

        {mode === "login" && (
          <p className="mt-8 text-center text-xs text-emerald/50">
            Admin login: <strong>admin</strong> / Primenew@1111
          </p>
        )}
      </section>
    </SiteLayout>
  );
}
