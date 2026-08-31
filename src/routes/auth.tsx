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
  const [showPassword, setShowPassword] = useState(false);
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
    console.log('[Auth] Form submitted, mode:', mode);
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        console.log('[Auth] Calling signup...');
        const result = referralCode
          ? await signup({ data: { name, email, password, referralCode } })
          : await signup({ data: { name, email, password } });
        console.log('[Auth] Signup result:', result);
        // Set cookie from token
        document.cookie = `auth_token=${result.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        if (result.user?.isAdmin) {
          console.log('[Auth] Navigating to /admin');
          navigate({ to: "/admin" });
        } else {
          console.log('[Auth] Navigating to /dashboard');
          navigate({ to: "/dashboard" });
        }
      } else {
        console.log('[Auth] Calling login with:', { userId: email, password: '***' });
        const result = await login({ data: { userId: email, password } });
        console.log('[Auth] Login result:', result);
        document.cookie = `auth_token=${result.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        if (result.user?.isAdmin) {
          console.log('[Auth] Navigating to /admin');
          navigate({ to: "/admin" });
        } else {
          console.log('[Auth] Navigating to /dashboard');
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err: any) {
      console.error('[Auth] Error:', err);
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
          <div className="relative">
            <input
              className={`${inputClass} pr-10`}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 px-1 text-emerald/40 transition-colors hover:text-gold"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
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


      </section>
    </SiteLayout>
  );
}
