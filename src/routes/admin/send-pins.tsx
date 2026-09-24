import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyPins, sendPin, sendPinsBulk, searchUserForActivation } from "../../functions/user/pins";

export const Route = createFileRoute("/admin/send-pins")({
  component: AdminSendPins,
});

function AdminSendPins() {
  const [pins, setPins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toCode, setToCode] = useState("");
  const [sendingPin, setSendingPin] = useState<string | null>(null);
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getMyPins();
      setPins(r.pins || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSearch = async () => {
    if (!toCode.trim()) { alert("Enter code to search"); return; }
    setSearching(true);
    try {
      const res = await searchUserForActivation({ data: { query: toCode } });
      if (!res.user) { alert("User not found"); setSearchedUser(null); }
      else setSearchedUser(res.user);
    } catch (err: any) { alert(err.message || "Search failed"); }
    finally { setSearching(false); }
  };

  const handleSend = async (pinStr: string) => {
    if (!toCode.trim()) { alert("Enter recipient code / ID"); return; }
    setSendingPin(pinStr);
    try {
      await sendPin({ data: { pin: pinStr, toCode } });
      alert(`PIN ${pinStr} sent to ${toCode}`);
      setToCode("");
      setSearchedUser(null);
      load();
    } catch (err: any) { alert(err.message || "Failed"); }
    finally { setSendingPin(null); }
  };

  const toggleSelect = (pinStr: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(pinStr)) n.delete(pinStr);
      else n.add(pinStr);
      return n;
    });
  };
  const selectAll = () => {
    if (selected.size === pins.length) setSelected(new Set());
    else setSelected(new Set(pins.map((p: any) => p.pin)));
  };
  const handleBulkSend = async () => {
    if (selected.size === 0) { alert("Select at least one PIN"); return; }
    if (!toCode.trim()) { alert("Enter recipient code / ID"); return; }
    setBulkSending(true);
    try {
      const res = await sendPinsBulk({ data: { pins: Array.from(selected), toCode } });
      alert(res.message);
      setSelected(new Set());
      setToCode("");
      setSearchedUser(null);
      load();
    } catch (err: any) { alert(err.message || "Failed"); }
    finally { setBulkSending(false); }
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
          <button onClick={handleSearch} disabled={searching} className="rounded bg-emerald px-4 py-2 text-xs font-bold text-white hover:bg-emerald/90 disabled:opacity-40">
            {searching ? "..." : "Search"}
          </button>
        </div>
        {searchedUser && (
          <div className="mt-3 rounded border border-emerald/20 bg-emerald/5 p-3 text-xs">
            <p className="font-semibold">{searchedUser.name} ({searchedUser.referralCode})</p>
            <p className="text-[11px] text-emerald/60">{searchedUser.email} · {searchedUser.isActive ? "Active" : "Inactive"}</p>
          </div>
        )}
        <p className="mt-1 text-[10px] text-emerald/50">Search the user, then click Send next to a PIN below.</p>
      </div>

      {loading ? <div className="py-12 text-center text-xs text-emerald/60">Loading...</div> : pins.length===0 ? <div className="rounded border border-gold/10 bg-card p-12 text-center text-xs text-emerald/60">No available PINs to send. Generate PINs first.</div> : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-gold/10 bg-card px-4 py-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-emerald">
              <input type="checkbox" checked={selected.size===pins.length && pins.length>0} onChange={selectAll} className="h-3 w-3 rounded border-gold/30" />
              Select All ({selected.size}/{pins.length})
            </label>
            <button onClick={handleBulkSend} disabled={bulkSending || selected.size===0} className="rounded bg-gold px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-cream hover:bg-emerald disabled:opacity-40">
              {bulkSending ? "Sending..." : `Send Selected (${selected.size})`}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pins.map((p:any)=> (
              <div key={p.id} className={`rounded border bg-card p-4 ${selected.has(p.pin) ? "border-gold ring-1 ring-gold/20" : "border-emerald/20"}`}>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-lg font-bold tracking-widest text-emerald">{p.pin}</div>
                  <input type="checkbox" checked={selected.has(p.pin)} onChange={()=>toggleSelect(p.pin)} className="h-4 w-4 rounded border-gold/30" />
                </div>
                <p className="text-[10px] text-emerald/50">{new Date(p.createdAt).toLocaleDateString("en-IN")}</p>
                <button onClick={()=>handleSend(p.pin)} disabled={!!sendingPin} className="mt-3 w-full rounded border border-emerald/20 bg-background px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald hover:bg-emerald/5 disabled:opacity-40">
                  {sendingPin===p.pin ? "Sending..." : "Send Single"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
