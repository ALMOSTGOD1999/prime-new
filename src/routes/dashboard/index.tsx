import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboard } from "../../functions/user/dashboard";
import { requestWithdrawal, getWithdrawals, getWithdrawalInfo } from "../../functions/user/withdraw";
import { getRankInfo } from "../../functions/user/rank";
import { getTeamStats, getDownlineUsers, getDirectUsers } from "../../functions/user/tree";
import { DashCard } from "../../components/DashCard";

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
  const [memberModal, setMemberModal] = useState<null | "downline" | "direct">(null);
  const [memberList, setMemberList] = useState<any[] | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const openMemberModal = async (kind: "downline" | "direct") => {
    setMemberModal(kind);
    setMemberList(null);
    setMemberSearch("");
    setMemberLoading(true);
    try {
      const list = kind === "downline" ? await getDownlineUsers() : await getDirectUsers();
      setMemberList(list);
    } catch (err) {
      console.error(err);
      setMemberList([]);
    } finally {
      setMemberLoading(false);
    }
  };

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
    pink: "from-rose-400 via-pink-400 to-orange-300",
    green: "from-emerald-500 via-green-500 to-teal-400",
    blue: "from-sky-400 via-blue-500 to-indigo-400",
    orange: "from-amber-400 via-orange-400 to-yellow-300",
    red: "from-red-400 via-rose-400 to-pink-300",
  };

  const memberQuery = memberSearch.trim().toLowerCase();
  const filteredMembers = (memberList ?? []).filter((m: any) =>
    !memberQuery ||
    (m.name ?? "").toLowerCase().includes(memberQuery) ||
    (m.referralCode ?? "").toLowerCase().includes(memberQuery),
  );

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-3xl">
            Welcome, <span className="italic text-gold">{user.name}</span>{" "}
            <span className="text-base sm:text-2xl text-gold/70">( {user.referralCode} )</span>
          </h1>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-emerald/70">
            Member since {new Date(user.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => copyReferral("left")}
            className="w-full border border-emerald/40 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-all hover:bg-emerald/10"
          >
            {copied === "left" ? "Copied!" : "Share Left Leg Link"}
          </button>
          <button
            onClick={() => copyReferral("right")}
            className="w-full border border-gold/40 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-all hover:bg-gold/10"
          >
            {copied === "right" ? "Copied!" : "Share Right Leg Link"}
          </button>
          {user.isAdmin && (
            <Link
              to="/admin"
              className="w-full bg-emerald px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80"
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
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-4">
            <DashCard title="Total Downline" value={teamStats.totalTeam ?? 0} gradient={gradients.pink} icon="🛍" onMoreInfo={() => openMemberModal("downline")} />
            <DashCard title="Total Direct" value={teamStats.directTeam ?? 0} gradient={gradients.green} icon="📊" onMoreInfo={() => openMemberModal("direct")} />
            <DashCard title={`Left Team: ${teamStats.teamLeft ?? 0}`} value={`${teamStats.teamLeftActive ?? 0} Active`} gradient={gradients.blue} icon="👤" details={<>
              <p>Total: {teamStats.teamLeft ?? 0}</p>
              <p>Active: {teamStats.teamLeftActive ?? 0}</p>
              <p>Business: ₹{(teamStats.totalBusinessLeft ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title={`Right Team: ${teamStats.teamRight ?? 0}`} value={`${teamStats.teamRightActive ?? 0} Active`} gradient={gradients.orange} icon="📊" details={<>
              <p>Total: {teamStats.teamRight ?? 0}</p>
              <p>Active: {teamStats.teamRightActive ?? 0}</p>
              <p>Business: ₹{(teamStats.totalBusinessRight ?? 0).toLocaleString("en-IN")}</p>
            </>} />
          </div>

          {/* Row 2: Business + income + awards */}
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-4">
            <DashCard title="Left Gold Business" value={`₹${(teamStats.teamBusinessLeftGold ?? 0).toLocaleString("en-IN")}`} gradient={gradients.orange} icon="📊" details={<>
              <p>Gold/Platinum purchase volume</p>
              <p>Total left: ₹{(teamStats.totalBusinessLeft ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title="Right Gold Business" value={`₹${(teamStats.teamBusinessRightGold ?? 0).toLocaleString("en-IN")}`} gradient={gradients.green} icon="📊" details={<>
              <p>Gold/Platinum purchase volume</p>
              <p>Total right: ₹{(teamStats.totalBusinessRight ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title="Cashback" value={`₹${(income.cashbackBalance ?? 0).toLocaleString("en-IN")}`} gradient={gradients.red} icon="💰" details={<>
              <p>Gold purchase cashback credited monthly</p>
              <p>3% / 3.5% / 4% based on purchase value</p>
            </>} />
            <DashCard title="Referral Income" value={`₹${(income.direct ?? 0).toLocaleString("en-IN")}`} gradient={gradients.pink} icon="🔗" details={<>
              <p>Earn for every direct referral</p>
              <p>5% one-time direct commission</p>
            </>} />
          </div>

          {/* Row 3: Awards, Joining Wallet, Matching Income (top-7 positions) */}
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
            <DashCard title="Joining Awards" value={income.awards?.length ?? 0} gradient={gradients.blue} icon="🏆" details={<>
              <p>Milestone rewards for pair matching</p>
              <p>Bag at 100 pairs · Phone at 500</p>
              <p>Laptop at 1000 · Scooty at 2000</p>
              <p>Car at 10000 pairs</p>
            </>} />
            <DashCard title="Joining Wallet" value={`₹${((income.direct ?? 0) + (income.matching ?? 0)).toLocaleString("en-IN")}`} gradient={gradients.green} icon="👛" details={<>
              <p>Referral + Matching income credited</p>
              <p>Referral: ₹{(income.direct ?? 0).toLocaleString("en-IN")} · Matching: ₹{(income.matching ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard title="Matching Income" value={`₹${(income.matching ?? 0).toLocaleString("en-IN")}`} gradient={gradients.orange} icon="💎" details={<>
              <p>20% of each qualifying pair match</p>
              <p>Direct: ₹{(income.direct ?? 0).toLocaleString("en-IN")}</p>
              <p>Total earned: ₹{(income.totalEarned ?? 0).toLocaleString("en-IN")}</p>
            </>} />
          </div>

          {/* Row 3b: Wallet balances — Working Withdraw sits just above Total Wallet */}
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
            <DashCard title="Working Withdraw Wallet" value={`₹${(income.workingWithdraw ?? 0).toLocaleString("en-IN")}`} gradient={gradients.green} icon="💼" details={<>
              <p>70% of working income — cashback + level + performance</p>
              <p>Gross working income: ₹{(income.workingGross ?? 0).toLocaleString("en-IN")}</p>
            </>} />
            <DashCard
              title="Total Wallet"
              subtitle="Performance Incentive and Level Income"
              value={`₹${((income.performanceTotal ?? 0) + (income.levelTotal ?? 0)).toLocaleString("en-IN")}`}
              gradient={gradients.blue}
              icon="💳"
              details={<>
                <p>Performance Incentive: ₹{(income.performanceTotal ?? 0).toLocaleString("en-IN")}</p>
                <p>Level Income: ₹{(income.levelTotal ?? 0).toLocaleString("en-IN")}</p>
              </>}
            />
            <DashCard title="Repurchase Wallet" value={`₹${(income.repurchaseBalance ?? 0).toLocaleString("en-IN")}`} gradient={gradients.orange} icon="🔁" details={<>
              <p>20% of every income credit</p>
              <p>Spendable on products</p>
            </>} />
          </div>

          {/* Row 4: Ratio, Rank */}
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
            <DashCard title="60:40 Ratio" value="Business Split" gradient={gradients.red} icon="⚖️" details={<>
              <p>Left: ₹{(teamStats.totalBusinessLeft ?? 0).toLocaleString("en-IN")}</p>
              <p>Right: ₹{(teamStats.totalBusinessRight ?? 0).toLocaleString("en-IN")}</p>
              <p>Income on weaker leg (60:40 split)</p>
            </>} />
            <DashCard title="Rank & Reward" value={rankInfo?.currentRankLabel ?? "Bronze"} gradient={gradients.blue} icon="🎖" details={<>
              <p>Team size: {rankInfo?.teamSize ?? 0} members</p>
              {rankInfo?.nextRank && <p>Next: {rankInfo.nextRankLabel} ({rankInfo.progress}%)</p>}
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
          <div className="text-right">
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-0.5 text-xs">
              <span className="text-emerald/70">
                Joining Withdraw Wallet:{" "}
                <span className="font-semibold text-gold">₹{Math.round(((income.direct ?? 0) + (income.matching ?? 0)) * 0.9).toLocaleString("en-IN")}</span>
              </span>
              <span className="text-emerald/70">
                Working Withdraw Wallet:{" "}
                <span className="font-semibold text-gold">₹{(income.workingWithdraw ?? 0).toLocaleString("en-IN")}</span>
              </span>
            </div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <span className="text-xs text-emerald/60">Available to withdraw:</span>
              <span className="font-display text-lg text-emerald">₹{income.incomeBalance.toLocaleString("en-IN")}</span>
            </div>
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
                    <th className="px-3 sm:px-6 py-2 text-left">Amount</th>
                    <th className="px-3 sm:px-6 py-2 text-left">Status</th>
                    <th className="px-3 sm:px-6 py-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawHistory.map((w: any) => (
                    <tr key={w.id} className="border-b border-gold/5">
                      <td className="px-3 sm:px-6 py-2 text-xs font-semibold text-emerald">
                        ₹{w.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 sm:px-6 py-2">
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
                      <td className="px-3 sm:px-6 py-2 text-right text-xs text-emerald/70">
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

      {user.isAdmin && (
        <Link
          to="/admin"
          className="block rounded border border-gold/20 bg-background p-6 text-center transition-colors hover:border-gold/40"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Admin Panel</p>
          <p className="mt-1 text-xs text-emerald/60">Manage users, purchases and more</p>
        </Link>
      )}

      {/* Member list modal — More info opens all downlines / direct referrals */}
      {memberModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setMemberModal(null)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gold/30 bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gold/20 px-5 py-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
                  {memberModal === "downline" ? "All Downlines" : "All Direct Referrals"}
                </h3>
                {memberList && (
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-emerald/60">
                    {memberList.length} members · {memberList.filter((m: any) => m.isActive).length} active
                  </p>
                )}
              </div>
              <button
                onClick={() => setMemberModal(null)}
                className="text-lg leading-none text-emerald/60 transition-colors hover:text-gold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="border-b border-gold/10 px-5 py-3">
              <input
                autoFocus
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search name or PR code…"
                className="w-full border-b border-gold/30 bg-transparent py-1.5 text-xs outline-none placeholder:text-emerald/50 focus:border-gold"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {memberLoading ? (
                <p className="px-5 py-6 text-center text-xs text-emerald/60">Loading members…</p>
              ) : filteredMembers.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-emerald/60">No members found.</p>
              ) : (
                <ul className="divide-y divide-gold/10">
                  {filteredMembers.map((m: any) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-xs">
                      <span className="text-emerald">
                        {m.name} <span className="text-gold/80">( {m.referralCode} )</span>
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          m.isActive ? "bg-emerald/10 text-emerald" : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// DashCard is imported from ../../components/DashCard
