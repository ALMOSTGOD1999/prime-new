import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getGoldPrice, setPriceAlert, getPriceAlerts, deletePriceAlert } from "../../functions/user/goldprice";

export const Route = createFileRoute("/dashboard/gold")({
  component: GoldPricePage,
});

function GoldPricePage() {
  const [priceData, setPriceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertDirection, setAlertDirection] = useState<"below" | "above">("below");
  const [settingAlert, setSettingAlert] = useState(false);

  useEffect(() => {
    loadPrice();
    loadAlerts();
  }, []);

  const loadPrice = async () => {
    try {
      const data = await getGoldPrice();
      setPriceData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await getPriceAlerts();
      setAlerts(data.alerts || []);
    } catch {}
  };

  const handleSetAlert = async () => {
    const price = parseInt(alertPrice, 10);
    if (!price || price <= 0) return alert("Enter a valid price");
    setSettingAlert(true);
    try {
      await setPriceAlert({ data: { targetPrice: price, direction: alertDirection } });
      setAlertPrice("");
      await loadAlerts();
    } catch (err: any) {
      alert(err.message || "Failed to set alert");
    } finally {
      setSettingAlert(false);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    try {
      await deletePriceAlert({ data: { alertId: id } });
      await loadAlerts();
    } catch {}
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-48 animate-pulse rounded border border-gold/20 bg-cream" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        Gold <span className="italic text-gold">Price</span>
      </h1>

      {/* Current Price */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald/70">Today's Gold Rate (XAU/USD)</p>
            {priceData?.price > 0 ? (
              <p className="mt-2 font-display text-4xl text-gold">${priceData.price.toLocaleString()}</p>
            ) : (
              <p className="mt-2 font-display text-4xl text-emerald/40">Not set yet</p>
            )}
          </div>
          <button onClick={loadPrice} className="border border-emerald/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-emerald/10">
            Refresh
          </button>
        </div>
        <p className="mt-3 text-[10px] text-emerald/50">Set by: {priceData?.source} • Updated: {priceData?.timestamp ? new Date(priceData.timestamp).toLocaleString("en-IN") : "N/A"}</p>
      </div>

      {/* Price Alerts */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Price Alerts</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={alertDirection}
            onChange={(e) => setAlertDirection(e.target.value as "below" | "above")}
            className="border-b border-gold/40 bg-transparent py-2 text-sm outline-none"
          >
            <option value="below">Price drops below</option>
            <option value="above">Price rises above</option>
          </select>
          <input
            type="number"
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
            placeholder="Target price (USD)"
            className="flex-1 border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60"
          />
          <button
            onClick={handleSetAlert}
            disabled={settingAlert || !alertPrice}
            className="bg-gold px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-50"
          >
            {settingAlert ? "Setting..." : "Set Alert"}
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded border border-gold/10 p-3">
                <div>
                  <span className={`text-xs font-semibold ${a.direction === "below" ? "text-blue-600" : "text-orange-600"}`}>
                    {a.direction === "below" ? "📉 Below" : "📈 Above"}
                  </span>
                  <span className="ml-2 font-display text-sm text-gold">${a.targetPrice}</span>
                  {a.triggeredAt && <span className="ml-2 text-[10px] text-emerald/60">• Triggered</span>}
                </div>
                <button onClick={() => handleDeleteAlert(a.id)} className="text-[10px] text-red-500 hover:text-red-700">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
