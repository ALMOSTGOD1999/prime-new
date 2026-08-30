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

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl">
        <span className="italic text-gold">Settings</span>
      </h1>

      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">
          Admin Credentials
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald/50">Email</p>
            <p className="text-sm font-semibold">admin</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald/50">Password</p>
            <p className="text-sm font-semibold">Primenew@1111</p>
          </div>
        </div>
      </div>

      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">
          Seed Admin User
        </h3>
        <p className="mb-4 text-xs text-emerald/60">
          Run this once to create the admin user in the database.
        </p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="bg-emerald px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
        >
          {seeding ? "Seeding..." : "Seed Admin"}
        </button>
        {seedResult && (
          <p className="mt-3 text-xs text-emerald/70">{seedResult}</p>
        )}
      </div>

      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">
          MLM Configuration
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald/50">Joining Amount</p>
            <p className="text-sm font-semibold">₹2,999</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald/50">Direct Commission</p>
            <p className="text-sm font-semibold">5%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald/50">Matching Income</p>
            <p className="text-sm font-semibold">20% per pair</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald/50">Daily Pair Cap</p>
            <p className="text-sm font-semibold">3 pairs (increases with milestones)</p>
          </div>
        </div>
      </div>

      <div className="rounded border border-gold/20 bg-cream">
        <div className="border-b border-gold/10 px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Matching Awards</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/50">
                <th className="px-6 py-3 text-left">Pairs</th>
                <th className="px-6 py-3 text-left">Award</th>
              </tr>
            </thead>
            <tbody>
              {[
                { pairs: "100 : 100", award: "Bag" },
                { pairs: "200 : 200", award: "Micro Oven" },
                { pairs: "500 : 500", award: "Smart Phone" },
                { pairs: "1000 : 1000", award: "Laptop" },
                { pairs: "2000 : 2000", award: "Scooty or DP ₹40,000" },
                { pairs: "5000 : 5000", award: "Bullet or DP ₹1 Lakh" },
                { pairs: "10000 : 10000", award: "Alto Car or DP ₹2 Lakh" },
                { pairs: "20000 : 20000", award: "Hyundai i20 or DP ₹4 Lakh" },
              ].map((row) => (
                <tr key={row.pairs} className="border-b border-gold/5">
                  <td className="px-6 py-3 text-xs font-semibold">{row.pairs}</td>
                  <td className="px-6 py-3 text-xs text-emerald/70">{row.award}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
