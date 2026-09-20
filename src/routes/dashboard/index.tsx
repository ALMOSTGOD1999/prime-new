import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboard } from "../../functions/user/dashboard";
import { requestWithdrawal, getWithdrawals, getWithdrawalInfo } from "../../functions/user/withdraw";
import { getRankInfo } from "../../functions/user/rank";
import { getTeamStats } from "../../functions/user/tree";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"" | "left" | "right">("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);
  const [withdrawInfo, setWithdrawInfo] = useState<any>(null);
  const [rankInfo, setRankInfo] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any>(null);

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
    getRankInfo()
      .then(setRankInfo)
      .catch(() => {});
    getTeamStats()
      .then(setTeamStats)
      .catch(() => {});
  }, []);

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

  const gradients = {
    pink: "from-rose-400 to-pink-500",
    green: "from-emerald-400 to-green-500",
    blue: "from-sky-400 to-blue-500",
    orange: "from-amber-400 to-orange-500",
    red: "from-red-400 to-rose-500",
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">
            Welcome, <span className="italic text-gold">{user.name}</span>
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-emerald/70">
            Member since {new Date(user.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => copyReferral("left")}
            className="border border-emerald/40 px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all hover:bg-emerald/10"
          >
            {copied === "left" ? "Copied!" : "Share Left Leg Link"}
          </button>
          <button
            onClick={() => copyReferral("right")}
            className="border border-gold/40 px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all hover:bg-gold/10"
          >
            {copied === "right" ? "Copied!" : "Share Right Leg Link"}
          </button>
          {user.isAdmin && (
            <Link
              to="/admin"
              className="bg-emerald px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80"
            >
              Admin Panel
            </Link>
          )}
        </div>
      </div>

      {/* Gradient stat cards */}
      {teamStats && (
        <>
          {/* Row 1: Team counts */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashCard title="Total Downline" value={teamStats.totalTeam ?? 0} gradient={gradients.pink} icon="🛍" details={<>
              <p>Active: {teamStats.activeTeam ?? 0}</p>
              <p>Inactive: {(teamStats.totalTeam ?? 0) - (teamStats.activeTeam ?? 0)}</p>
              <p>Left leg: {teamStats.teamLeft ?? 0} · Right leg: {teamStats.teamRight ?? 0}</p>
            </>} />
            <DashCard title="Total Direct" value={teamStats.directTeam ?? 0} gradient={gradients.green} icon="📊" details={<>
              <p>Left referrals: {teamStats.leftCount ?? 0}</p>
              <p>Right referrals: {teamStats.rightCount ?? 0}</p>
            </>} />
            <DashCard title={`Team Left: ${teamStats.teamLeft ?? 0}`} value={`Team Left Active: ${teamStats.teamLeftActive ?? 0}`} gradient={gradients.blue} icon="👤" details={<>
              <p>Total members: {teamStats.teamLeft ?? 0}</p>
              <p>Active: {teamStats.teamLeftActive ?? 0}</p>
              <p>Business: ₹{(teamStats.totalBusinessLeft ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title={`Team Right: ${teamStats.teamRight ?? 0}`} value={`Team Right Active: ${teamStats.teamRightActive ?? 0}`} gradient={gradients.orange} icon="📊" details={<>
              <p>Total members: {teamStats.teamRight ?? 0}</p>
              <p>Active: {teamStats.teamRightActive ?? 0}</p>
              <p>Business: ₹{(teamStats.totalBusinessRight ?? 0).toLocaleString("en-IN")}</p>
            </>} />
          </div>

          {/* Row 2: Left business */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashCard title="Total Business Team Left" value={`₹${(teamStats.totalBusinessLeft ?? 0).toLocaleString("en-IN")}`} gradient={gradients.green} icon="📊" details={<>
              <p>Total business volume from left leg members</p>
              <p>Active business: ₹{(teamStats.teamBusinessLeftActive ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title="Team Business Left Active" value={`₹${(teamStats.teamBusinessLeftActive ?? 0).toLocaleString("en-IN")}`} gradient={gradients.blue} icon="📊" details={<>
              <p>Only active members who have made purchases</p>
              <p>Gold/Platinum: ₹{(teamStats.teamBusinessLeftGold ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title="Team Business Left Gold" value={`₹${(teamStats.teamBusinessLeftGold ?? 0).toLocaleString("en-IN")}`} gradient={gradients.orange} icon="📊" details={<>
              <p>Purchase volume from Gold and Platinum ranked members</p>
              <p>Total left business: ₹{(teamStats.totalBusinessLeft ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title="Total Business Team Right" value={`₹${(teamStats.totalBusinessRight ?? 0).toLocaleString("en-IN")}`} gradient={gradients.red} icon="📊" details={<>
              <p>Total business volume from right leg members</p>
              <p>Active business: ₹{(teamStats.teamBusinessRightActive ?? 0).toLocaleString("en-IN")}</p>
            </>} />
          </div>

          {/* Row 3: Right business + cashback + awards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashCard title="Total Right Business Joining" value={`₹${(teamStats.totalBusinessRight ?? 0).toLocaleString("en-IN")}`} gradient={gradients.orange} icon="📊" details={<>
              <p>Joining and purchase amount from right leg</p>
              <p>Gold/Platinum: ₹{(teamStats.teamBusinessRightGold ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title="Team Business Right Gold" value={`₹${(teamStats.teamBusinessRightGold ?? 0).toLocaleString("en-IN")}`} gradient={gradients.green} icon="📊" details={<>
              <p>Purchase volume from Gold and Platinum ranked members</p>
              <p>Total right business: ₹{(teamStats.totalBusinessRight ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title="Cash Back Income" value={`₹${(income.cashbackBalance ?? 0).toLocaleString("en-IN")}`} gradient={gradients.red} icon="📊" details={<>
              <p>30% of self business as monthly cashback</p>
              <p>Spendable on products only</p>
            </>} />
            <DashCard title="Joining Awards" value={income.awards?.length ?? 0} gradient={gradients.blue} icon="📊" details={<>
              <p>Milestone rewards for pair matching</p>
              <p>Bag at 100 pairs · Phone at 500</p>
              <p>Laptop at 1000 · Scooty at 2000</p>
              <p>Car at 10000 pairs</p>
            </>} />
          </div>

          {/* Row 4: Ratio, Rank, Matching */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashCard title="60 : 40 Ratio" value={`${(teamStats.totalBusinessLeft ?? 0).toLocaleString("en-IN")} : ${(teamStats.totalBusinessRight ?? 0).toLocaleString("en-IN")}`} gradient={gradients.red} icon="📊" details={<>
              <p>Left business volume vs Right business volume</p>
              <p>Income calculated on the weaker leg (60:40 split)</p>
            </>} />
            <DashCard title="60:40 Ratio Rank and Reward" value={`${rankInfo?.currentRankLabel ?? "Bronze"} : ${rankInfo?.teamSize ?? 0}`} gradient={gradients.blue} icon="📊" details={<>
              <p>Current rank: {rankInfo?.currentRankLabel ?? "Bronze"}</p>
              <p>Team size: {rankInfo?.teamSize ?? 0} members</p>
              {rankInfo?.nextRank && <p>Next rank: {rankInfo.nextRankLabel} ({rankInfo.progress}%)</p>}
            </>} />
            <DashCard title="Matching Income" value={`₹${(income.matching ?? 0).toLocaleString("en-IN")}`} gradient={gradients.orange} icon="📊" details={<>
              <p>20% of each qualifying pair match</p>
              <p>Direct commission: ₹{(income.direct ?? 0).toLocaleString("en-IN")}</p>
              <p>Total earned: ₹{(income.totalEarned ?? 0).toLocaleString("en-IN")}</p>
            </>} />
          </div>
        </>
      )}

      {/* Account Inactive */}
      {!user.isActive && (
        <div className="rounded border-2 border-gold/40 bg-gold/5 p-6">
          <h3 className="font-display text-xl text-gold">Account Inactive</h3>
          <p className="mt-1 text-xs text-emerald/60">
            Contact admin to activate your account and unlock binary matching income.
          </p>
        </div>
      )}

      {/* Referral Links */}
      <div className="rounded-2xl border border-gold/20 bg-background p-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Your Referral Links</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button onClick={() => copyReferral("left")} className="rounded-lg border border-emerald/30 bg-emerald/5 p-3 text-left transition-colors hover:bg-emerald/10">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald">{copied === "left" ? "Copied!" : "Left Leg Link"}</p>
            <code className="block break-all text-xs text-emerald/70">{window.location.origin}/auth?ref={user.referralCode}L</code>
          </button>
          <button onClick={() => copyReferral("right")} className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-left transition-colors hover:bg-gold/10">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gold">{copied === "right" ? "Copied!" : "Right Leg Link"}</p>
            <code className="block break-all text-xs text-emerald/70">{window.location.origin}/auth?ref={user.referralCode}R</code>
          </button>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="rounded border border-gold/20 bg-background p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Withdraw Funds</h3>
            <p className="mt-1 text-xs text-emerald/70">
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
            className="whitespace-nowrap bg-gold px-6 py-2 text-xs font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-40"
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
            <h4 className="mb-2 text-xs uppercase tracking-widest text-emerald/70">Recent Withdrawals</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/10 text-xs uppercase tracking-widest text-emerald/70">
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
                          className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
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
                      <td className="px-4 py-2 text-right text-xs text-emerald/70">
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

      {/* Recent Income */}
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
                <tr className="border-b border-gold/10 text-xs uppercase tracking-widest text-emerald/70">
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
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase ${
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
                    <td className="px-6 py-3 text-right text-xs text-emerald/70">
                      {new Date(item.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {user.isAdmin && (
        <Link
          to="/admin"
          className="block rounded border border-gold/20 bg-background p-6 text-center transition-colors hover:border-gold/40"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Admin Panel</p>
          <p className="mt-1 text-xs text-emerald/60">Manage users, purchases and more</p>
        </Link>
      )}
    </div>
  );
}

function DashCard({
  title,
  value,
  gradient,
  icon,
  details,
}: {
  title: string;
  value: string | number;
  gradient: string;
  icon?: string;
  details?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg transition-transform hover:scale-[1.02]`}
    >
      {icon && (
        <span className="absolute right-4 top-4 text-4xl opacity-30">{icon}</span>
      )}
      <p className="text-sm font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-90">{title}</p>
      {details && (
        <>
          <div
            className="mt-3 cursor-pointer border-t border-white/20 pt-2"
            onClick={() => setExpanded(!expanded)}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              {expanded ? "Less info ↑" : "More info →"}
            </p>
          </div>
          {expanded && (
            <div className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-relaxed opacity-90">
              {details}
            </div>
          )}
        </>
      )}
    </div>
  );
}
