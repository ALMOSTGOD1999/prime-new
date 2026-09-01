import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// We'll query withdrawals via a generic admin endpoint or direct DB access.
// For now, let's create a server function placeholder and build the UI.

export const Route = createFileRoute("/admin/payout")({
  component: AdminPayout,
});

function AdminPayout() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Create getAdminPayouts server function
    // For now show placeholder
    setLoading(false);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-display text-4xl tracking-tight">
          <span className="italic text-gold">Payout</span> Management
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/60">
          Review and process withdrawal requests
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-xl border border-gold/15 bg-gradient-to-br from-gold/8 to-gold/3 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/70">Pending Payouts</p>
          <p className="mt-2 font-display text-3xl tracking-tight text-gold">—</p>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-emerald/15 bg-gradient-to-br from-emerald/8 to-emerald/3 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/70">Approved Today</p>
          <p className="mt-2 font-display text-3xl tracking-tight text-emerald">—</p>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald/20 to-transparent" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-red-100 bg-gradient-to-br from-red-50/50 to-cream p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/70">Rejected</p>
          <p className="mt-2 font-display text-3xl tracking-tight text-red-500">—</p>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-200 to-transparent" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gold/10 bg-cream shadow-sm">
        <div className="flex items-center gap-3 border-b border-gold/10 px-6 py-4">
          <div className="rounded-lg bg-gold/10 p-2">
            <svg className="h-5 w-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">Withdrawal Requests</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-gold/10 p-4">
            <svg className="h-8 w-8 text-gold/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
          </div>
          <p className="mt-4 text-xs text-emerald/60">Payout management will appear here once users submit withdrawal requests.</p>
          <p className="mt-1 text-[10px] text-emerald/70">Users can request withdrawals from their dashboard between 12:00 AM — 12:00 PM IST.</p>
        </div>
      </div>
    </div>
  );
}
