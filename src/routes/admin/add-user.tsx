import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signup } from "../../functions/auth/signup";

export const Route = createFileRoute("/admin/add-user")({
  component: AdminAddUser,
});

function AdminAddUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    referralCode: "",
    leg: "left" as "left" | "right",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      alert("Name, email and password are required");
      return;
    }
    setLoading(true);
    try {
      const signupData: { name: string; email: string; password: string; referralCode?: string; leg?: "left" | "right" } = {
        name: form.name,
        email: form.email,
        password: form.password,
      };
      if (form.referralCode) {
        signupData.referralCode = form.referralCode;
        signupData.leg = form.leg;
      }
      const result = await signup({ data: signupData });
      alert(`User created! Referral code: ${result.user.referralCode}`);
      setForm({ name: "", email: "", password: "", referralCode: "", leg: "left" });
    } catch (err: any) {
      alert(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gold/15 bg-cream px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-emerald/70 focus:border-gold/40 focus:ring-2 focus:ring-gold/10";

  return (
    <div className="mx-auto max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-display text-4xl tracking-tight">
          <span className="italic text-gold">Add</span> User
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/60">
          Register a new member manually
        </p>
      </div>

      <form onSubmit={handleAdd} className="space-y-5 rounded-xl border border-gold/10 bg-cream p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/60">Full Name</label>
          <input
            className={inputClass}
            placeholder="e.g. Priya Sharma"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/60">Email</label>
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
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/60">Password</label>
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
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/60">
            Referral Code <span className="text-emerald/60">(optional)</span>
          </label>
          <input
            className={inputClass}
            placeholder="e.g. PR0001"
            value={form.referralCode}
            onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
          />
          <p className="mt-1 text-[10px] text-emerald/60">Leave blank to create a root user</p>
        </div>

        {form.referralCode && (
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/60">
              Placement Leg
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, leg: "left" })}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-200 ${
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
                className={`flex-1 rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-200 ${
                  form.leg === "right"
                    ? "border-gold bg-gold text-cream shadow-sm"
                    : "border-gold/20 text-emerald/60 hover:border-gold/40 hover:bg-gold/5"
                }`}
              >
                Right Leg →
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-emerald/60">
              User will be placed on the <strong className={form.leg === "left" ? "text-emerald" : "text-gold"}>{form.leg}</strong> leg of the referrer
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream shadow-sm shadow-emerald/20 transition-all duration-200 hover:bg-emerald/90 hover:shadow-md disabled:opacity-50"
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
          <button
            type="button"
            onClick={() => navigate({ to: "/admin/users" })}
            className="rounded-lg border border-gold/20 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald/60 transition-all duration-200 hover:border-gold/40 hover:bg-gold/5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
