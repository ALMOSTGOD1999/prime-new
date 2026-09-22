import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminUsers } from "../../functions/admin/users";
import { getAdminIncome } from "../../functions/admin/income";
import { monthlyCashbackPayout } from "../../functions/admin/cashback";
import { processMonthlyReturns } from "../../functions/admin/investment";
import { getTotalBusiness } from "../../functions/admin/business";
import { DashCard } from "../../components/DashCard";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [usersData, setUsersData] = useState<any>(null);
  const [incomeData, setIncomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cashbackLoading, setCashbackLoading] = useState(false);
  const [cashbackResult, setCashbackResult] = useState<any>(null);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsResult, setReturnsResult] = useState<any>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  const handleCashbackPayout = async () => {
    if (!confirm("Credit monthly cashback (30% of self business) to all eligible users?")) return;
    setCashbackLoading(true);
    try {
      const result = await monthlyCashbackPayout();
      setCashbackResult(result);
      alert(`Credited cashback to ${result.totalUsers} users!`);
    } catch (err: any) {
      alert(err.message || "Cashback payout failed");
    } finally {
      setCashbackLoading(false);
    }
  };

  const handleProcessReturns = async () => {
    if (!confirm("Process monthly investment returns for all active investments?")) return;
    setReturnsLoading(true);
    try {
      const result = await processMonthlyReturns();
      setReturnsResult(result);
      alert(`Processed ${result.totalInvestments} investments! ₹${result.totalCredited.toLocaleString("en-IN")} credited.`);
    } catch (err: any) {
      alert(err.message || "Returns processing failed");
    } finally {
      setReturnsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      getAdminUsers({ data: {} }),
      getAdminIncome({ data: {} }),
      getTotalBusiness(),
    ])
      .then(([u, i, b]) => { setUsersData(u); setIncomeData(i); setBusinessData(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-gradient-to-r from-gold/10 to-gold/5" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-gold/10 bg-background shadow-sm" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-gold/10 bg-background shadow-sm" />
      </div>
    );
  }

  if (!usersData || !incomeData) return null;

  const totalUsers = usersData.total || 0;
  const activeUsers = usersData.users?.filter((u: any) => u.isActive).length || 0;
  const summary = incomeData.summary || [];
  const totalDirect = summary.find((s: any) => s.type === "direct")?.total || 0;
  const totalMatching = summary.find((s: any) => s.type === "matching")?.total || 0;

  const gradients = {
    pink: "from-rose-400 to-pink-500",
    green: "from-emerald-400 to-green-500",
    blue: "from-sky-400 to-blue-500",
    orange: "from-amber-400 to-orange-500",
    red: "from-red-400 to-rose-500",
  };

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl tracking-tight">
            Admin <span className="italic text-gold">Dashboard</span>
          </h1>
          <p className="mt-1 text-[11px] sm:text-xs uppercase tracking-[0.2em] text-emerald/60">Platform overview & analytics</p>
        </div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald px-4 sm:px-5 py-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-cream shadow-sm shadow-emerald/20 transition-all duration-200 hover:bg-emerald/90 hover:shadow-md hover:shadow-emerald/30 hover:-translate-y-0.5"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
          Manage Users
        </Link>
      </div>

      {/* Stat Cards - Row 1: Users + Business */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-4">
        <DashCard
          title="Total Users"
          value={String(totalUsers)}
          gradient={gradients.pink}
          icon="👥"
          details={<>
            <p>Active: {activeUsers}</p>
            <p>Inactive: {totalUsers - activeUsers}</p>
          </>}
        />
        <DashCard
          title="Total Business"
          value={`₹${(businessData?.totalBusiness || 0).toLocaleString("en-IN")}`}
          gradient={gradients.green}
          icon="💰"
          details={<>
            <p>Purchase business: ₹{(businessData?.totalPurchaseBusiness || 0).toLocaleString("en-IN")}</p>
            <p>Total volume from all sources</p>
          </>}
        />
        <DashCard
          title="Purchase Business"
          value={`₹${(businessData?.totalPurchaseBusiness || 0).toLocaleString("en-IN")}`}
          gradient={gradients.blue}
          icon="🛍"
          details={<>
            <p>Gold/jewellery purchase volume</p>
            <p>All approved purchases included</p>
          </>}
        />
        <DashCard
          title="Active Users"
          value={String(activeUsers)}
          gradient={gradients.orange}
          icon="✅"
          details={<>
            <p>Accounts with active status</p>
            <p>Eligible for matching income</p>
          </>}
        />
      </div>

      {/* Stat Cards - Row 2: Income */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <DashCard
          title="Direct Paid"
          value={`₹${totalDirect.toLocaleString("en-IN")}`}
          gradient={gradients.red}
          icon="💸"
          details={<>
            <p>Total direct referral commissions paid</p>
            <p>Percentage of referred user purchases</p>
          </>}
        />
        <DashCard
          title="Matching Paid"
          value={`₹${totalMatching.toLocaleString("en-IN")}`}
          gradient={gradients.blue}
          icon="🤝"
          details={<>
            <p>Total binary matching commissions paid</p>
            <p>Based on weaker leg pair matching</p>
          </>}
        />
        <DashCard
          title="Total Income Paid"
          value={`₹${(totalDirect + totalMatching).toLocaleString("en-IN")}`}
          gradient={gradients.green}
          icon="📊"
          details={<>
            <p>Direct: ₹${totalDirect.toLocaleString("en-IN")}</p>
            <p>Matching: ₹${totalMatching.toLocaleString("en-IN")}</p>
          </>}
        />
      </div>

      {/* Monthly Cashback Payout */}
      <div className="overflow-hidden rounded-xl border border-gold/10 bg-background shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gold/10 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gold/10 p-2">
                  <svg className="h-4 w-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
                </div>
                <div>
                  <h3 className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-gold">Monthly Cashback Payout</h3>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-emerald/60">Credits 30% of each active user's self business to their cashback wallet</p>
            </div>
          </div>
          <button
            onClick={handleCashbackPayout}
            disabled={cashbackLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 sm:px-5 py-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-cream shadow-sm shadow-gold/20 transition-all duration-200 hover:bg-gold/90 hover:shadow-md hover:shadow-gold/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cashbackLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818.879.659 1.171-1.671.48-.642A3 3 0 0 1 15.96 12H18a3 3 0 0 1 3 3v.342M3 9.342A3 3 0 0 1 5.96 6H8.04c.734 0 1.413.468 1.658 1.165l.637 1.787M3 9.342V15a3 3 0 0 0 3 3h.64M12 6V3" /></svg>
                Credit Cashback
              </>
            )}
          </button>
        </div>
        {cashbackResult && (
          <div className="px-6 py-3 bg-emerald/5 border-b border-emerald/10">
            <p className="text-xs text-emerald">
              Credited <span className="font-semibold">₹{cashbackResult.credited?.reduce((s: number, c: any) => s + c.cashback, 0).toLocaleString("en-IN")}</span> total cashback to <span className="font-semibold">{cashbackResult.totalUsers}</span> users.
            </p>
          </div>
        )}
      </div>

      {/* Monthly Investment Returns */}
      <div className="overflow-hidden rounded-xl border border-gold/10 bg-background shadow-sm">
        <div className="flex items-center justify-between border-b border-gold/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald/10 p-2">
              <svg className="h-4 w-4 text-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
            </div>
            <div>
              <h3 className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-gold">Monthly Investment Returns</h3>
              <p className="mt-0.5 text-[11px] sm:text-xs text-emerald/60">Credits monthly returns from active investments to user wallets (70/20/10 split)</p>
            </div>
          </div>
          <button
            onClick={handleProcessReturns}
            disabled={returnsLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald px-4 sm:px-5 py-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-cream shadow-sm shadow-emerald/20 transition-all duration-200 hover:bg-emerald/90 hover:shadow-md hover:shadow-emerald/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {returnsLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818.879.659 1.171-1.671.48-.642A3 3 0 0 1 15.96 12H18a3 3 0 0 1 3 3v.342M3 9.342A3 3 0 0 1 5.96 6H8.04c.734 0 1.413.468 1.658 1.165l.637 1.787M3 9.342V15a3 3 0 0 0 3 3h.64M12 6V3" /></svg>
                Process Returns
              </>
            )}
          </button>
        </div>
        {returnsResult && (
          <div className="px-6 py-3 bg-emerald/5 border-b border-emerald/10">
            <p className="text-xs text-emerald">
              Processed <span className="font-semibold">{returnsResult.totalInvestments}</span> investments. Credited <span className="font-semibold">₹{returnsResult.totalCredited.toLocaleString("en-IN")}</span> total returns.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
