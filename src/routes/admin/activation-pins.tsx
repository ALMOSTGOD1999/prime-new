import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { generateActivationPins, getActivationPins } from "../../functions/admin/activation-pins";

export const Route = createFileRoute("/admin/activation-pins")({
  component: AdminActivationPins,
});

function AdminActivationPins() {
  const [pinCount, setPinCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pins, setPins] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, used: 0, unused: 0 });
  const [generatedPins, setGeneratedPins] = useState<string[]>([]);
  const [showGenerated, setShowGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPins();
  }, []);

  const loadPins = async () => {
    setLoading(true);
    try {
      const result = await getActivationPins();
      setPins(result.pins);
      setStats(result.stats);
    } catch (err) {
      console.error("Failed to load pins:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (pinCount < 1 || pinCount > 500) {
      alert("Count must be between 1 and 500");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateActivationPins({ data: { count: pinCount } });
      setGeneratedPins(result.pins);
      setShowGenerated(true);
      await loadPins();
    } catch (err: any) {
      alert(err.message || "Failed to generate pins");
    } finally {
      setGenerating(false);
    }
  };

  const copyAllPins = () => {
    const text = generatedPins.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">
          Activation <span className="italic text-gold">PINs</span>
        </h1>
        <p className="mt-1 text-[10px] sm:text-xs text-emerald/70">
          Generate and manage 6-digit activation PINs for user accounts.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border border-gold/20 bg-background p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-emerald/60">Total</p>
          <p className="mt-1 font-display text-2xl text-emerald">{stats.total}</p>
        </div>
        <div className="rounded border border-gold/20 bg-background p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gold">Used</p>
          <p className="mt-1 font-display text-2xl text-gold">{stats.used}</p>
        </div>
        <div className="rounded border border-gold/20 bg-background p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-emerald/60">Available</p>
          <p className="mt-1 font-display text-2xl text-emerald">{stats.unused}</p>
        </div>
      </div>

      {/* Generate Section */}
      <div className="rounded border border-gold/20 bg-background p-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
          Generate New PINs
        </h3>
        <p className="mt-1 text-[10px] text-emerald/60">
          Enter the number of 6-digit PINs to generate (1-500).
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            min="1"
            max="500"
            value={pinCount}
            onChange={(e) => setPinCount(parseInt(e.target.value) || 0)}
            className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none focus:border-gold sm:w-32"
          />
          <button
            onClick={handleGenerate}
            disabled={generating || pinCount < 1 || pinCount > 500}
            className="whitespace-nowrap bg-gold px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-40"
          >
            {generating ? "Generating..." : `Generate ${pinCount} PINs`}
          </button>
        </div>
      </div>

      {/* Generated PINs Display */}
      {showGenerated && generatedPins.length > 0 && (
        <div className="rounded border border-emerald/30 bg-emerald/5 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald">
              ✓ {generatedPins.length} PINs Generated
            </h3>
            <button
              onClick={copyAllPins}
              className="rounded border border-emerald/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald hover:bg-emerald/10"
            >
              {copied ? "Copied!" : "Copy All"}
            </button>
          </div>
          <div className="mt-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {generatedPins.map((pin, i) => (
                <div
                  key={i}
                  className="rounded bg-card px-3 py-1.5 text-center font-mono text-sm text-emerald"
                >
                  {pin}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PIN History Table */}
      <div className="rounded border border-gold/20 bg-background">
        <div className="border-b border-gold/10 px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
            PIN History
          </h3>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-xs text-emerald/60">Loading...</div>
        ) : pins.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-emerald/60">
            No PINs generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-6 py-3 text-left">PIN</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-left">Used By</th>
                  <th className="px-6 py-3 text-right">Created</th>
                  <th className="px-6 py-3 text-right">Used At</th>
                </tr>
              </thead>
              <tbody>
                {pins.map((p: any) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gold/5 transition-colors hover:bg-gold/5 ${
                      p.isUsed ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-6 py-3">
                      <span
                        className={`font-mono text-sm ${
                          p.isUsed
                            ? "text-emerald/40 line-through decoration-2"
                            : "text-emerald font-semibold"
                        }`}
                      >
                        {p.pin}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                          p.isUsed
                            ? "bg-destructive/10 text-red-500"
                            : "bg-emerald/10 text-emerald"
                        }`}
                      >
                        {p.isUsed ? "Used" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-emerald/70">
                      {p.usedBy ? `User #${p.usedBy}` : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-[10px] text-emerald/70">
                      {new Date(p.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-3 text-right text-[10px] text-emerald/70">
                      {p.usedAt
                        ? new Date(p.usedAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
