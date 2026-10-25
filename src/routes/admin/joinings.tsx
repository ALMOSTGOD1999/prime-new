import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getJoiningsReport } from "../../functions/admin/joinings";

export const Route = createFileRoute("/admin/joinings")({
  component: AdminJoiningsPage,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function AdminJoiningsPage() {
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await getJoiningsReport({ data: { from, to } });
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to generate report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl">
        Joinings <span className="italic text-gold">Report</span>
      </h1>

      {/* Range selector */}
      <div className="rounded border border-gold/20 bg-background p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-[10px] uppercase tracking-widest text-emerald/70">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded border border-gold/20 bg-background px-3 py-2 text-sm text-emerald focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
            />
          </div>
          <div className="flex-1">
            <label className="mb-2 block text-[10px] uppercase tracking-widest text-emerald/70">To Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded border border-gold/20 bg-background px-3 py-2 text-sm text-emerald focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading || !from || !to}
            className="rounded bg-gold px-6 py-2 text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50 sm:mb-0.5"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>

      {data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded border border-gold/20 bg-background p-6">
              <p className="text-[10px] uppercase tracking-widest text-emerald/70">Total Joined</p>
              <p className="mt-2 font-display text-3xl text-emerald">{data.summary.joined}</p>
            </div>
            <div className="rounded border border-gold/20 bg-background p-6">
              <p className="text-[10px] uppercase tracking-widest text-emerald/70">Activated</p>
              <p className="mt-2 font-display text-3xl text-gold">{data.summary.activated}</p>
            </div>
            <div className="rounded border border-gold/20 bg-background p-6">
              <p className="text-[10px] uppercase tracking-widest text-emerald/70">Pending</p>
              <p className="mt-2 font-display text-3xl text-emerald/60">{data.summary.pending}</p>
            </div>
            <div className="rounded border border-gold/20 bg-background p-6">
              <p className="text-[10px] uppercase tracking-widest text-emerald/70">Package Value</p>
              <p className="mt-2 font-display text-3xl text-gold">
                ₹{data.summary.packageTotal.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Per-day breakdown */}
          <div className="rounded border border-gold/20 bg-background">
            <div className="border-b border-gold/10 px-6 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
                Day-wise Joinings ({data.summary.days} day{data.summary.days === 1 ? "" : "s"})
              </h3>
            </div>
            {data.byDay.length === 0 ? (
              <p className="px-6 py-6 text-sm text-emerald/60">No joinings in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-right">Joined</th>
                      <th className="px-6 py-3 text-right">Activated</th>
                      <th className="px-6 py-3 text-right">Pending</th>
                      <th className="px-6 py-3 text-right">Package Value</th>
                      <th className="px-6 py-3 text-left">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byDay.map((d: any) => {
                      const max = Math.max(...data.byDay.map((x: any) => x.joined), 1);
                      return (
                        <tr key={d.date} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                          <td className="px-6 py-3 text-xs font-semibold text-gold">
                            {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-3 text-right text-xs font-bold text-emerald">{d.joined}</td>
                          <td className="px-6 py-3 text-right text-xs text-gold">{d.activated}</td>
                          <td className="px-6 py-3 text-right text-xs text-emerald/60">{d.joined - d.activated}</td>
                          <td className="px-6 py-3 text-right text-xs text-emerald">
                            ₹{d.packageSum.toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-3">
                            <div className="h-2 w-full max-w-[160px] rounded bg-emerald/10">
                              <div
                                className="h-2 rounded bg-gold"
                                style={{ width: `${(d.joined / max) * 100}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Full listing */}
          <div className="rounded border border-gold/20 bg-background">
            <div className="border-b border-gold/10 px-6 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
                Joining Details ({data.listing.length} record{data.listing.length === 1 ? "" : "s"})
              </h3>
            </div>
            {data.listing.length === 0 ? (
              <p className="px-6 py-6 text-sm text-emerald/60">No records found for this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                      <th className="px-6 py-3 text-left">#</th>
                      <th className="px-6 py-3 text-left">Name</th>
                      <th className="px-6 py-3 text-left">Code</th>
                      <th className="px-6 py-3 text-left">Joined</th>
                      <th className="px-6 py-3 text-left">Activated</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Referred By</th>
                      <th className="px-6 py-3 text-left">Leg</th>
                      <th className="px-6 py-3 text-right">Package</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.listing.map((r: any) => (
                      <tr key={r.id} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                        <td className="px-6 py-3 text-xs font-bold text-gold">#{r.id}</td>
                        <td className="px-6 py-3 text-xs font-semibold">{r.name}</td>
                        <td className="px-6 py-3 text-[10px] text-emerald/70">{r.referralCode}</td>
                        <td className="px-6 py-3 text-[11px] text-emerald/70">
                          {r.joinedDate}
                          <span className="ml-1 text-emerald/40">{r.joinedTime}</span>
                        </td>
                        <td className="px-6 py-3 text-[11px] text-emerald/70">{r.activatedDate || "—"}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              r.isActive ? "bg-emerald/15 text-emerald" : "bg-gold/15 text-gold"
                            }`}
                          >
                            {r.isActive ? "Active" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[11px] text-emerald/70">
                          {r.referrerName !== "—" ? `${r.referrerName} (${r.referrerCode})` : "—"}
                        </td>
                        <td className="px-6 py-3 text-[10px] uppercase text-emerald/60">{r.position || "—"}</td>
                        <td className="px-6 py-3 text-right text-xs text-emerald">
                          ₹{(r.packageAmount || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="rounded border border-dashed border-gold/20 bg-background p-10 text-center">
          <p className="text-sm text-emerald/60">
            Pick a date range and press <span className="font-semibold text-gold">Generate</span> to see who joined on each date.
          </p>
        </div>
      )}
    </div>
  );
}
