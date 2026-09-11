import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboard } from "../../functions/user/dashboard";
import { requestWithdrawal, getWithdrawals, getWithdrawalInfo } from "../../functions/user/withdraw";
import { getLegBalance } from "../../functions/user/legbalance";
import { getRankInfo } from "../../functions/user/rank";
import { getTeamStats } from "../../functions/user/tree";
import { activateDailyReward, getDailyActivationStatus } from "../../functions/user/daily-activation";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"" | "left" | "right">("");
  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);
  const [withdrawInfo, setWithdrawInfo] = useState<any>(null);
  const [legBalance, setLegBalance] = useState<any>(null);
  const [rankInfo, setRankInfo] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [dailyActivation, setDailyActivation] = useState<any>(null);
  const [dailyActivationLoading, setDailyActivationLoading] = useState(false);

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
    getLegBalance()
      .then(setLegBalance)
      .catch(() => {});
    getRankInfo()
      .then(setRankInfo)
      .catch(() => {});
    getTeamStats()
      .then(setTeamStats)
      .catch(() => {});
    getDailyActivationStatus()
      .then(setDailyActivation)
      .catch(() => {});
  }, []);

  const copyReferral = (leg: "left" | "right") => {
    const url = `${window.location.origin}/auth?ref=${data?.user?.referralCode}${leg === "left" ? "L" : "R"}`;
    navigator.clipboard.writeText(url);
    setCopied(leg);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleDailyActivation = async () => {
    setDailyActivationLoading(true);
    try {
      const result = await activateDailyReward();
      alert(`Daily activation successful! ₹${result.rewardAmount} credited to your income wallet.`);
      // Refresh daily activation status
      const status = await getDailyActivationStatus();
      setDailyActivation(status);
      // Refresh dashboard data
      const dashData = await getDashboard();
      setData(dashData);
    } catch (err: any) {
      alert(err.message || "Daily activation failed");
    } finally {
      setDailyActivationLoading(false);
    }
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
            <div key={i} className="h-28 animate-pulse rounded border border-gold/20 bg-background p-6" />
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
          <h1 className="font-display text-2xl sm:text-3xl">
            Welcome, <span className="italic text-gold">{user.name}</span>
          </h1>
          <p className="mt-1 text-[10px] sm:text-xs uppercase tracking-widest text-emerald/70">
            Member since {new Date(user.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => copyReferral("left")}
            className="border border-emerald/40 px-3 sm:px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-emerald/10"
          >
            {copied === "left" ? "Copied!" : "Share Left Leg Link"}
          </button>
          <button
            onClick={() => copyReferral("right")}
            className="border border-gold/40 px-3 sm:px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-gold/10"
          >
            {copied === "right" ? "Copied!" : "Share Right Leg Link"}
          </button>
          {user.isAdmin && (
            <Link
              to="/admin"
              className="bg-emerald px-3 sm:px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80"
            >
              Admin Panel
            </Link>
          )}
        </div>
      </div>

      {/* Team Overview — 60:40 layout */}
      {teamStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          {/* Left: 60% — Team Stats */}
          <div className="rounded border border-gold/20 bg-background p-6 sm:col-span-3">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">My Team</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-emerald/20 bg-emerald/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-emerald/70">Direct Team</p>
                <p className="mt-1 font-display text-3xl text-emerald">{teamStats.directTeam}</p>
                <p className="text-[10px] text-emerald/60">L: {teamStats.leftCount} · R: {teamStats.rightCount}</p>
              </div>
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-gold">Total Team</p>
                <p className="mt-1 font-display text-3xl text-gold">{teamStats.totalTeam}</p>
                <p className="text-[10px] text-emerald/60">{teamStats.activeTeam} active members</p>
              </div>
            </div>
          </div>

          {/* Right: 40% — Total Business */}
          <div className="rounded border border-gold/20 bg-background p-6 sm:col-span-2">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Total Business</h3>
            <div className="rounded-lg border border-emerald/20 bg-emerald/5 p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-emerald/70">Business Volume</p>
              <p className="mt-2 font-display text-3xl text-emerald">₹{teamStats.totalBusiness.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-[10px] text-emerald/60">Package value of your team</p>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-[10px] text-emerald/60">Active rate:</span>
              <span className="font-display text-sm text-emerald">
                {teamStats.totalTeam > 0 ? Math.round((teamStats.activeTeam / teamStats.totalTeam) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Daily ID Activation Reward */}
      {user.isActive && dailyActivation && (
        <div className="rounded border border-gold/20 bg-background p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Daily ID Activation</h3>
              <p className="mt-1 text-[10px] text-emerald/70">
                Activate your ID daily between 12:00 PM — 12:00 AM IST to earn ₹100 reward.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-emerald/60">Today's Reward</p>
                <p className="font-display text-lg text-gold">₹{dailyActivation.rewardAmount}</p>
              </div>
              <button
                onClick={handleDailyActivation}
                disabled={dailyActivationLoading || dailyActivation.activatedToday || !dailyActivation.isWithdrawalTime}
                className={`whitespace-nowrap px-6 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all ${
                  dailyActivation.activatedToday
                    ? "bg-emerald/20 text-emerald cursor-not-allowed"
                    : dailyActivation.isWithdrawalTime
                      ? "bg-gold text-cream hover:bg-emerald"
                      : "bg-emerald/20 text-emerald cursor-not-allowed"
                }`}
              >
                {dailyActivationLoading
                  ? "Processing..."
                  : dailyActivation.activatedToday
                    ? "✓ Activated Today"
                    : dailyActivation.isWithdrawalTime
                      ? "Activate Now"
                      : `Opens at ${dailyActivation.nextActivationTime}`}
              </button>
            </div>
          </div>
          {!dailyActivation.isWithdrawalTime && !dailyActivation.activatedToday && (
            <p className="mt-3 text-[10px] text-gold">
              ⏰ Withdrawal window: 12:00 PM — 12:00 AM IST daily
            </p>
          )}
        </div>
      )}

      {!user.isActive && (
        <div className="rounded border-2 border-gold/40 bg-gold/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl text-gold">Account Inactive</h3>
              <p className="mt-1 text-xs text-emerald/60">
                Contact admin to activate your account and unlock binary matching income.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Wallet Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Working Wallet" value={`₹${income.workingBalance.toLocaleString("en-IN")}`} icon="◆" subtitle="All gross income (no deductions)" />
        <StatCard title="Income Wallet" value={`₹${income.incomeBalance.toLocaleString("en-IN")}`} icon="◇" subtitle="Net income after 20% + 10% deductions" />
        <StatCard title="Re-Purchase Wallet" value={`₹${income.repurchaseBalance.toLocaleString("en-IN")}`} icon="◈" subtitle="20% reserved · Spend on products" />
        <StatCard title="Cashback Wallet" value={`₹${income.cashbackBalance.toLocaleString("en-IN")}`} icon="○" subtitle="Monthly cashback · Spend on products" />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Earned" value={`₹${income.totalEarned.toLocaleString("en-IN")}`} icon="▣" subtitle="Lifetime earnings" />
        <StatCard title="Today's Pairs" value={`${income.todayPairs} / 3`} icon="◎" subtitle="Daily pair cap" />
        <StatCard title="Total Income" value={`₹${income.totalIncome.toLocaleString("en-IN")}`} icon="▤" subtitle="Direct + Matching" />
      </div>

      {/* Leg Balance + Rank */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {legBalance && (
          <div className="rounded border border-gold/20 bg-background p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Leg Balance</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1 rounded-lg border border-emerald/20 bg-emerald/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-emerald/70">Left Leg</p>
                <p className="mt-1 font-display text-2xl text-emerald">{legBalance.leftTotal}</p>
                <p className="text-[10px] text-emerald/60">active members</p>
              </div>
              <div className="text-xl text-gold/40">vs</div>
              <div className="flex-1 rounded-lg border border-gold/20 bg-gold/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-gold">Right Leg</p>
                <p className="mt-1 font-display text-2xl text-gold">{legBalance.rightTotal}</p>
                <p className="text-[10px] text-emerald/60">active members</p>
              </div>
            </div>
          </div>
        )}
        {rankInfo && (
          <div className="rounded border border-gold/20 bg-background p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Your Rank</h3>
            <div className="flex items-center gap-4">
              <div className={`rounded-lg border px-4 py-2 text-sm font-bold uppercase ${
                rankInfo.currentRank === "platinum" ? "border-purple-300 bg-purple-100 text-purple-700" :
                rankInfo.currentRank === "gold" ? "border-yellow-300 bg-yellow-100 text-yellow-700" :
                rankInfo.currentRank === "silver" ? "border-gray-300 bg-gray-100 text-gray-700" :
                "border-orange-300 bg-orange-100 text-orange-700"
              }`}>
                {rankInfo.currentRankLabel}
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-emerald/70">Team: {rankInfo.teamSize} members</p>
                {rankInfo.nextRank && (
                  <>
                    <div className="mt-1 h-2 rounded-full bg-emerald/10">
                      <div className="h-2 rounded-full bg-gold transition-all" style={{ width: `${rankInfo.progress}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-emerald/60">Next: {rankInfo.nextRankLabel}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Section — from Income Wallet only */}
      <div className="rounded border border-gold/20 bg-background p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Withdraw Funds</h3>
            <p className="mt-1 text-[10px] text-emerald/70">
              From Income Wallet. Available 12:00 AM — 12:00 PM IST daily. Missed days carry over.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald/60">Income Wallet:</span>
            <span className="font-display text-lg text-emerald">₹{income.incomeBalance.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            min="1"
            max={income.incomeBalance}
            placeholder="Enter amount"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="flex-1 border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
          />
          <button
            onClick={handleWithdraw}
            disabled={withdrawLoading || !withdrawInfo?.isOpen || income.incomeBalance <= 0}
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
                                ? "bg-destructive/10 text-red-600"
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

      <div className="rounded border border-gold/20 bg-background p-6">
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

      <div className="rounded border border-gold/20 bg-background">
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
        <div className="rounded border border-gold/20 bg-background p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Direct Commission</p>
          <p className="mt-1 font-display text-2xl text-emerald">₹{income.direct.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[10px] text-emerald/60">5% one-time per referral</p>
        </div>
        <div className="rounded border border-gold/20 bg-background p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Matching Income</p>
          <p className="mt-1 font-display text-2xl text-gold">₹{income.matching.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[10px] text-emerald/60">20% per pair match</p>
        </div>
        <div className="rounded border border-gold/20 bg-background p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Income Split</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px]"><span className="text-emerald/60">→ Re-purchase (20%)</span><span className="text-gold">₹{Math.round(income.totalIncome * 0.2).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-emerald/60">→ Admin charge (10%)</span><span className="text-red-400">₹{Math.round(income.totalIncome * 0.1).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-emerald/60">→ Income wallet (70%)</span><span className="text-emerald">₹{Math.round(income.totalIncome * 0.7).toLocaleString("en-IN")}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle }: { title: string; value: string; icon: string; subtitle?: string }) {
  return (
    <div className="rounded border border-gold/20 bg-background p-6 transition-colors hover:border-gold/40">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-emerald/70">{title}</p>
        <span className="text-gold/40">{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {subtitle && <p className="mt-1 text-[10px] text-emerald/50">{subtitle}</p>}
    </div>
  );
}
