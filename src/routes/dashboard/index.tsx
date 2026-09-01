import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboard } from "../../functions/user/dashboard";
import { activate } from "../../functions/user/activate";
import { requestWithdrawal, getWithdrawals, getWithdrawalInfo } from "../../functions/user/withdraw";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState<"" | "left" | "right">("");
  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);
  const [withdrawInfo, setWithdrawInfo] = useState<any>(null);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
    getWithdrawalInfo()
      .then(setWithdrawInfo)
      .catch(() => {});
    getWithdrawals()
      .then((d) => setWithdrawHistory(d.withdrawals || []))
      .catch(() => {});
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

  const copyReferral = (leg: "left" | "right") => {
    const url = `${window.location.origin}/auth?ref=${data?.user?.referralCode}${leg === "left" ? "L" : "R"}`;
    navigator.clipboard.writeText(url);
    setCopied(leg);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setWithdrawLoading(true);
    try {
      const result = await requestWithdrawal({ data: { amount } });
      alert(`Withdrawal requested! Remaining balance: ₹${result.remainingBalance.toLocaleString("en-IN")}`);
      setWithdrawAmount("");
      // Refresh data
      const [dashData, histData] = await Promise.all([getDashboard(), getWithdrawals()]);
      setData(dashData);
      setWithdrawHistory(histData.withdrawals || []);
    } catch (err: any) {
      alert(err.message || "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
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
          <p className="mt-1 text-xs uppercase tracking-widest text-emerald/70">
            Member since {new Date(user.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => copyReferral("left")}
            className="border border-emerald/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-emerald/10"
          >
            {copied === "left" ? "Copied!" : "Share Left Leg Link"}
          </button>
          <button
            onClick={() => copyReferral("right")}
            className="border border-gold/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-gold/10"
          >
            {copied === "right" ? "Copied!" : "Share Right Leg Link"}
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

      {/* Withdrawal Section */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Withdraw Funds</h3>
            <p className="mt-1 text-[10px] text-emerald/70">
              Available 12:00 AM — 12:00 PM IST daily. Missed days carry over.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald/60">Balance:</span>
            <span className="font-display text-lg text-emerald">₹{income.balance.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            min="1"
            max={income.balance}
            placeholder="Enter amount"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="flex-1 border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
          />
          <button
            onClick={handleWithdraw}
            disabled={withdrawLoading || !withdrawInfo?.isOpen || income.balance <= 0}
            className="whitespace-nowrap bg-gold px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-40"
          >
            {withdrawLoading
              ? "Processing..."
              : !withdrawInfo?.isOpen
                ? `Opens at 12 AM IST`
                : "Withdraw"}
          </button>
        </div>

        {withdrawHistory.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-2 text-[10px] uppercase tracking-widest text-emerald/70">Recent Withdrawals</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawHistory.map((w: any) => (
                    <tr key={w.id} className="border-b border-gold/5">
                      <td className="px-4 py-2 text-xs font-semibold text-emerald">
                        ₹{w.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                            w.status === "approved"
                              ? "bg-emerald/10 text-emerald"
                              : w.status === "rejected"
                                ? "bg-red-50 text-red-600"
                                : "bg-gold/10 text-gold"
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-[10px] text-emerald/70">
                        {new Date(w.requestedAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">Your Referral Code</h3>
        <p className="font-display text-2xl">{user.referralCode}</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald/20 bg-emerald/5 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald">Left Leg Link</p>
            <code className="block break-all text-[10px] text-emerald/70">
              {window.location.origin}/auth?ref={user.referralCode}L
            </code>
          </div>
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gold">Right Leg Link</p>
            <code className="block break-all text-[10px] text-emerald/70">
              {window.location.origin}/auth?ref={user.referralCode}R
            </code>
          </div>
        </div>
      </div>

      <div className="rounded border border-gold/20 bg-cream">
        <div className="border-b border-gold/10 px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Recent Income</h3>
        </div>
        {income.recentIncome.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-emerald/60">
            No income recorded yet. Activate your account and build your team!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
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
                    <td className="px-6 py-3 text-right text-[10px] text-emerald/70">
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
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Direct Commission</p>
          <p className="mt-1 font-display text-2xl text-emerald">₹{income.direct.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[10px] text-emerald/60">5% one-time per referral</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Matching Income</p>
          <p className="mt-1 font-display text-2xl text-gold">₹{income.matching.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[10px] text-emerald/60">20% per pair (3 pairs/day cap)</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Total Earned</p>
          <p className="mt-1 font-display text-2xl text-emerald">₹{income.totalEarned.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[10px] text-emerald/60">Lifetime earnings</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="rounded border border-gold/20 bg-cream p-6 transition-colors hover:border-gold/40">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-emerald/70">{title}</p>
        <span className="text-gold/40">{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </div>
  );
}
