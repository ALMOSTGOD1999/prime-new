import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyPins, sendPin } from "../../functions/user/pins";

export const Route = createFileRoute("/admin/send-pins")({
  component: AdminSendPins,
});

function AdminSendPins() {
  const [pins, setPins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toCode, setToCode] = useState("");
  const [sendingPin, setSendingPin] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getMyPins();
      setPins(r.pins || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSend = async (pinStr: string) => {
    if (!toCode.trim()) { alert("Enter recipient code / ID"); return; }
    setSendingPin(pinStr);
    try {
      await sendPin({ data: { pin: pinStr, toCode } });
      alert(`PIN ${pinStr} sent to ${toCode}`);
      setToCode("");
      load();
    } catch (err: any) { alert(err.message || "Failed"); }
    finally { setSendingPin(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">Send <span className="italic text-gold">PINs</span></h1>
        <p className="mt-1 text-xs text-emerald/70">Admin can send PINs to any user. Users can also send to each other.</p>
      </div>

      <div className="rounded border border-gold/20 bg-background p-4">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-gold">Recipient</label>
        <div className="mt-2 flex gap-2">
          <input value={toCode} onChange={(e)=>setToCode(e.target.value)} placeholder="Referral code / Email / ID e.g. PR1234" className="flex-1 rounded border border-gold/20 px-3 py-2 text-sm outline-none focus:border-gold/40" />
        </div>
        <p className="mt-1 text-[10px] text-emerald/50">Enter the code of the user you want to send a PIN to, then click Send next to a PIN below.</p>
      </div>

      {loading ? <div className="py-12 text-center text-xs text-emerald/60">Loading...</div> : pins.length===0 ? <div className="rounded border border-gold/10 bg-card p-12 text-center text-xs text-emerald/60">No available PINs to send. Generate PINs first.</div> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pins.map((p:any)=> (
            <div key={p.id} className="rounded border border-emerald/20 bg-card p-4">
              <div className="font-mono text-lg font-bold tracking-widest text-emerald">{p.pin}</div>
              <p className="text-[10px] text-emerald/50">{new Date(p.createdAt).toLocaleDateString("en-IN")}</p>
              <button onClick={()=>handleSend(p.pin)} disabled={!!sendingPin} className="mt-3 w-full rounded bg-emerald px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream hover:bg-emerald/90 disabled:opacity-40">
                {sendingPin===p.pin ? "Sending..." : "Send PIN"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
