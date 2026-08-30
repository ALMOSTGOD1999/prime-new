import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboard } from "../../functions/user/dashboard";
import { activate } from "../../functions/user/activate";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const result = await activate();
      alert(`Activated! Direct: ₹${result.directAmount}, Matching pairs: ${result.matchingEvents?.length || 0}`);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Activation failed");
    } finally {
      setActivating(false);
    }
  };

  const copyReferral = () => {
    const url = `${window.location.origin}/auth?ref=${data?.user?.referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded border border-gold/20 bg-cream p-6" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, income } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl">
            Welcome, <span className="italic text-gold">{user.name}</span>
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-emerald/50">
            Member since {new Date(user.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={copyReferral}
            className="border border-gold/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-gold/10"
          >
            {copied ? "Copied!" : "Share Referral Link"}
          </button>
          {user.isAdmin && (
            <Link
              to="/admin"
              className="bg-emerald px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80"
            >
              Admin Panel
            </Link>
          )}
        </div>
      </div>

      {!user.isActive && (
        <div className="rounded border-2 border-gold/40 bg-gold/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl text-gold">Activate Your Account</h3>
              <p className="mt-1 text-xs text-emerald/60">
                Joining package: ₹2,999 — unlocks binary matching income and all benefits.
              </p>
            </div>
            <button
              onClick={handleActivate}
              disabled={activating}
              className="whitespace-nowrap bg-gold px-8 py-3 text-xs font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-50"
            >
              {activating ? "Activating..." : "Activate — ₹2,999"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Income" value={`₹${income.totalIncome.toLocaleString("en-IN")}`} icon="◈" />
        <StatCard title="Wallet Balance" value={`₹${income.balance.toLocaleString("en-IN")}`} icon="◇" />
        <StatCard title="Total Pairs" value={String(income.totalPairs)} icon="◆" />
        <StatCard title="Today's Pairs" value={`${income.todayPairs} / 3`} icon="○" />
      </div>

      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">Your Referral Code</h3>
        <p className="font-display text-2xl">{user.referralCode}</p>
        <p className="mt-2 text-[10px] text-emerald/50">
          Share this code or link to invite others:
        </p>
        <code className="mt-1 block break-all text-[10px] text-emerald/70">
          {window.location.origin}/auth?ref={user.referralCode}
        </code>
      </div>

      <div className="rounded border border-gold/20 bg-cream">
        <div className="border-b border-gold/10 px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Recent Income</h3>
        </div>
        {income.recentIncome.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-emerald/40">
            No income recorded yet. Activate your account and build your team!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/50">
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Description</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {income.recentIncome.map((item: any) => (
                  <tr key={item.id} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          item.type === "direct"
                            ? "bg-emerald/10 text-emerald"
                            : item.type === "matching"
                              ? "bg-gold/10 text-gold"
                              : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-emerald/70">{item.description}</td>
                    <td className="px-6 py-3 text-right text-xs font-semibold text-emerald">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-3 text-right text-[10px] text-emerald/50">
                      {new Date(item.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/50">Direct Commission</p>
          <p className="mt-1 font-display text-2xl text-emerald">₹{income.direct.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[10px] text-emerald/40">5% one-time per referral</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/50">Matching Income</p>
          <p className="mt-1 font-display text-2xl text-gold">₹{income.matching.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[10px] text-emerald/40">20% per pair (3 pairs/day cap)</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/50">Total Earned</p>
          <p className="mt-1 font-display text-2xl text-emerald">₹{income.totalEarned.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[10px] text-emerald/40">Lifetime earnings</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="rounded border border-gold/20 bg-cream p-6 transition-colors hover:border-gold/40">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-emerald/50">{title}</p>
        <span className="text-gold/40">{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </div>
  );
}
