import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { seed } from "../../functions/admin/seed";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState("");

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult("");
    try {
      const result = await seed();
      setSeedResult(result.message || "Done");
    } catch (err: any) {
      setSeedResult(err.message || "Failed to seed admin");
    } finally {
      setSeeding(false);
    }
  };

  const awards = [
    { pairs: "100 : 100", award: "Bag", tier: 1 },
    { pairs: "200 : 200", award: "Micro Oven", tier: 1 },
    { pairs: "500 : 500", award: "Smart Phone", tier: 2 },
    { pairs: "1,000 : 1,000", award: "Laptop", tier: 2 },
    { pairs: "2,000 : 2,000", award: "Scooty or DP ₹40,000", tier: 3 },
    { pairs: "5,000 : 5,000", award: "Bullet or DP ₹1 Lakh", tier: 3 },
    { pairs: "10,000 : 10,000", award: "Alto Car or DP ₹2 Lakh", tier: 4 },
    { pairs: "20,000 : 20,000", award: "Hyundai i20 or DP ₹4 Lakh", tier: 4 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl tracking-tight">
          <span className="italic text-gold">Settings</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/60">Configuration & management</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Admin Credentials */}
        <div className="rounded-xl border border-gold/10 bg-cream p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-emerald/10 p-2">
              <svg className="h-5 w-5 text-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">Admin Credentials</h3>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald/[0.03] p-4 ring-1 ring-emerald/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/60">Email / User ID</p>
              <p className="mt-1 text-sm font-bold">admin</p>
            </div>
            <div className="rounded-lg bg-emerald/[0.03] p-4 ring-1 ring-emerald/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/60">Password</p>
              <p className="mt-1 font-mono text-sm font-bold tracking-wide">Primenew@1111</p>
            </div>
          </div>
        </div>

        {/* Seed Admin */}
        <div className="rounded-xl border border-gold/10 bg-cream p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-gold/10 p-2">
              <svg className="h-5 w-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">Seed Admin User</h3>
          </div>
          <p className="mb-4 text-xs text-emerald/70">
            Run this to create the admin user in the database. Safe to run multiple times.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream shadow-sm shadow-emerald/20 transition-all duration-200 hover:bg-emerald/90 hover:shadow-md hover:shadow-emerald/30 disabled:opacity-50"
          >
            {seeding ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream border-t-transparent" />
                Seeding...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" /></svg>
                Seed Admin
              </>
            )}
          </button>
          {seedResult && (
            <div className="mt-4 rounded-lg bg-emerald/5 p-3 ring-1 ring-emerald/10">
              <p className="text-xs font-medium text-emerald">{seedResult}</p>
            </div>
          )}
        </div>
      </div>

      {/* MLM Configuration */}
      <div className="rounded-xl border border-gold/10 bg-cream p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-gold/10 p-2">
            <svg className="h-5 w-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">MLM Configuration</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Joining Amount", value: "₹2,999", color: "emerald" },
            { label: "Direct Commission", value: "5%", color: "emerald" },
            { label: "Matching Income", value: "20% per pair", color: "gold" },
            { label: "Daily Pair Cap", value: "3 pairs", color: "gold" },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg p-4 ring-1 ${item.color === "emerald" ? "bg-emerald/[0.03] ring-emerald/10" : "bg-gold/[0.03] ring-gold/10"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/60">{item.label}</p>
              <p className={`mt-1 font-display text-xl ${item.color === "emerald" ? "text-emerald" : "text-gold"}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Matching Awards */}
      <div className="overflow-hidden rounded-xl border border-gold/10 bg-cream shadow-sm">
        <div className="flex items-center gap-3 border-b border-gold/10 px-6 py-4">
          <div className="rounded-lg bg-gold/10 p-2">
            <svg className="h-5 w-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.015 6.015 0 0 1-2.27.466 6.015 6.015 0 0 1-2.27-.466" /></svg>
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">Matching Awards</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 text-[10px] uppercase tracking-[0.2em] text-emerald/60">
                <th className="px-6 py-3 text-left font-semibold">Tier</th>
                <th className="px-6 py-3 text-left font-semibold">Pairs</th>
                <th className="px-6 py-3 text-left font-semibold">Award</th>
              </tr>
            </thead>
            <tbody>
              {awards.map((row, i) => (
                <tr
                  key={row.pairs}
                  className={`border-b border-gold/5 transition-all duration-200 hover:bg-gold/5 ${i % 2 === 0 ? "bg-emerald/[0.02]" : ""}`}
                >
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      row.tier === 1 ? "bg-emerald/10 text-emerald" :
                      row.tier === 2 ? "bg-gold/15 text-gold" :
                      row.tier === 3 ? "bg-amber-100 text-amber-700" :
                      "bg-red-50 text-red-600"
                    }`}>
                      T{row.tier}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-xs font-semibold text-emerald/70">{row.pairs}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-semibold">{row.award}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
