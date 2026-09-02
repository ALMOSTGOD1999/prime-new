import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { signup } from "../../functions/auth/signup";
import { getMe } from "../../functions/auth/me";

export const Route = createFileRoute("/dashboard/add-user")({
  component: DashboardAddUser,
});

function DashboardAddUser() {
  const [loading, setLoading] = useState(false);
  const [myCode, setMyCode] = useState("");
  const [copied, setCopied] = useState<"left" | "right" | "">("");
  const [created, setCreated] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    leg: "left" as "left" | "right",
  });

  useEffect(() => {
    getMe().then((d) => setMyCode(d.user?.referralCode || "")).catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      alert("All fields are required");
      return;
    }
    setLoading(true);
    try {
      const result = await signup({
        data: {
          name: form.name,
          email: form.email,
          password: form.password,
          referralCode: myCode,
          leg: form.leg,
        },
      });
      setCreated(result.user);
      setForm({ name: "", email: "", password: "", leg: "left" });
    } catch (err: any) {
      alert(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const copyReferral = (leg: "left" | "right") => {
    const url = `${window.location.origin}/auth?ref=${created.referralCode}${leg === "left" ? "L" : "R"}`;
    navigator.clipboard.writeText(url);
    setCopied(leg);
    setTimeout(() => setCopied(""), 2000);
  };

  const inputClass =
    "w-full border-b border-gold/40 bg-transparent py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-emerald/60 focus:border-gold";

  if (created) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded border border-emerald/20 bg-emerald/5 p-6 text-center">
          <p className="text-4xl">✅</p>
          <h2 className="mt-3 font-display text-2xl text-emerald">User Created!</h2>
          <p className="mt-1 text-xs text-emerald/70">{created.name} ({created.referralCode})</p>
        </div>

        <div className="rounded border border-gold/20 bg-cream p-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Share Referral Links</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => copyReferral("left")}
              className="rounded-lg border border-emerald/20 bg-emerald/5 p-4 text-center transition-all hover:border-emerald/40 hover:bg-emerald/10"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald">← Left Leg</p>
              <p className="mt-1 text-[10px] text-emerald/60">{copied === "left" ? "Copied!" : "Click to copy"}</p>
            </button>
            <button
              onClick={() => copyReferral("right")}
              className="rounded-lg border border-gold/20 bg-gold/5 p-4 text-center transition-all hover:border-gold/40 hover:bg-gold/10"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gold">Right Leg →</p>
              <p className="mt-1 text-[10px] text-emerald/60">{copied === "right" ? "Copied!" : "Click to copy"}</p>
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setCreated(null)}
            className="flex-1 rounded-lg bg-emerald px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80"
          >
            Add Another User
          </button>
          <Link
            to="/dashboard"
            className="rounded-lg border border-gold/20 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-emerald/60 transition-all hover:border-gold/40 hover:bg-gold/5"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-3xl">
          <span className="italic text-gold">Add</span> User
        </h1>
        <p className="mt-1 text-xs text-emerald/70">
          Register a new member under your team. They'll be placed on your{" "}
          <strong className={form.leg === "left" ? "text-emerald" : "text-gold"}>{form.leg}</strong> leg.
        </p>
      </div>

      <form onSubmit={handleAdd} className="space-y-5 rounded border border-gold/20 bg-cream p-6">
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-emerald/70">Full Name</label>
          <input
            className={inputClass}
            placeholder="e.g. Priya Sharma"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-emerald/70">Email</label>
          <input
            className={inputClass}
            type="email"
            placeholder="e.g. priya@example.com"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-emerald/70">Password</label>
          <input
            className={inputClass}
            type="password"
            placeholder="Min 6 characters"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-emerald/70">Your Referral Code</label>
          <p className="font-display text-lg text-gold">{myCode || "Loading..."}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-emerald/70">Placement Leg</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, leg: "left" })}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all ${
                form.leg === "left"
                  ? "border-emerald bg-emerald text-cream shadow-sm"
                  : "border-gold/20 text-emerald/60 hover:border-gold/40 hover:bg-gold/5"
              }`}
            >
              ← Left Leg
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, leg: "right" })}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all ${
                form.leg === "right"
                  ? "border-gold bg-gold text-cream shadow-sm"
                  : "border-gold/20 text-emerald/60 hover:border-gold/40 hover:bg-gold/5"
              }`}
            >
              Right Leg →
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-emerald/60">
            User will be placed on the <strong className={form.leg === "left" ? "text-emerald" : "text-gold"}>{form.leg}</strong> leg
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !myCode}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Create User
              </>
            )}
          </button>
          <Link
            to="/dashboard"
            className="rounded-lg border border-gold/20 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-emerald/60 transition-all hover:border-gold/40 hover:bg-gold/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
