import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { activateWithPin } from "../../functions/user/activate-with-pin";
import { getMyPins, getPinsHistory, activateAccountWithPin, searchUserForActivation } from "../../functions/user/pins";
import { getDashboard } from "../../functions/user/dashboard";

export const Route = createFileRoute("/dashboard/activate-account")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: ((search as any)["tab"] as "activation" | "my-pins" | "history") || "activation",
  }),
  component: ActivateAccount,
});

function ActivateAccount() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setTab = (t: "activation" | "my-pins" | "history") =>
    navigate({ to: "/dashboard/activate-account", search: { tab: t } as any });
  const [myPins, setMyPins] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [pinsLoading, setPinsLoading] = useState(false);
  const [targetCode, setTargetCode] = useState("");
  const [targetActivating, setTargetActivating] = useState<string | null>(null);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getDashboard().then(setUser).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.isActive) setSuccess("Your account is already active!");
  }, [user]);

  const loadPins = async () => {
    setPinsLoading(true);
    try {
      const [my, hist] = await Promise.all([getMyPins(), getPinsHistory()]);
      setMyPins(my.pins || []);
      setHistory(hist.pins || []);
    } catch (e) { console.error(e); }
    finally { setPinsLoading(false); }
  };

  useEffect(() => {
    if (tab === "my-pins" || tab === "history") loadPins();
  }, [tab]);

  const handleActivate = async () => {
    setError(null); setSuccess(null);
    if (!pin || pin.length !== 6) { setError("Please enter a valid 6-digit PIN"); return; }
    setActivating(true);
    try {
      const result = await activateWithPin({ data: { pin } });
      setSuccess(result.message);
      setPin("");
    } catch (err: any) { setError(err.message || "Activation failed"); }
    finally { setActivating(false); }
  };

  const handleActivateTarget = async (pinStr: string) => {
    if (!targetCode.trim()) { alert("Enter target account code/ID to activate"); return; }
    setTargetActivating(pinStr);
    try {
      const res = await activateAccountWithPin({ data: { pin: pinStr, targetCode } });
      alert(res.message);
      setTargetCode("");
      loadPins();
    } catch (err: any) { alert(err.message || "Failed"); }
    finally { setTargetActivating(null); }
  };

  const copyPin = (p: string) => {
    navigator.clipboard.writeText(p);
    setCopiedPin(p);
    setTimeout(() => setCopiedPin(null), 1500);
  };

  const handleSearchUser = async () => {
    if (!targetCode.trim()) { alert("Enter code to search"); return; }
    setSearching(true);
    try {
      const res = await searchUserForActivation({ data: { query: targetCode } });
      if (!res.user) { alert("Account not found"); setSearchedUser(null); }
      else setSearchedUser(res.user);
    } catch (e:any) { alert(e.message || "Search failed"); }
    finally { setSearching(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="text-sm uppercase tracking-widest text-emerald/70">Loading...</div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">Activate <span className="italic text-gold">Account</span></h1>
        <p className="mt-1 text-[10px] sm:text-xs text-emerald/70">Enter a 6-digit PIN or manage your PINs.</p>
      </div>

      <div className="flex rounded-lg border border-gold/20 bg-background p-0.5 w-fit">
        {(["activation","my-pins","history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${tab===t ? "bg-emerald text-cream shadow-sm" : "text-emerald/60 hover:text-emerald"}`}>
            {t === "activation" ? "Activation" : t === "my-pins" ? "My Pins" : "Pins History"}
          </button>
        ))}
      </div>

      {tab === "activation" && (
        <>
          {user?.isActive ? (
            <div className="rounded border border-emerald/20 bg-emerald/5 p-6 text-center">
              <div className="text-4xl">✅</div>
              <h3 className="mt-3 font-display text-lg text-emerald">Account Active</h3>
              <p className="mt-1 text-xs text-emerald/60">Your account is already activated and ready to use.</p>
            </div>
          ) : (
            <div className="rounded border border-gold/20 bg-background p-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Enter Activation PIN</h3>
              <p className="mt-1 text-[10px] text-emerald/60">Get the PIN from your admin, then enter it below.</p>
              <div className="mt-4">
                <input type="text" maxLength={6} pattern="[0-9]*" inputMode="numeric" value={pin} onChange={(e)=>{const v=e.target.value.replace(/\D/g,"").slice(0,6); setPin(v); setError(null);}} placeholder="Enter 6-digit PIN" className="w-full border-b border-gold/40 bg-transparent py-3 text-center font-mono text-2xl tracking-[0.3em] text-emerald outline-none placeholder:text-emerald/30 focus:border-gold" disabled={activating} />
              </div>
              <button onClick={handleActivate} disabled={activating || pin.length!==6} className="mt-6 w-full bg-gold px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-cream hover:bg-emerald disabled:opacity-40">
                {activating ? "Activating..." : "Activate Account"}
              </button>
            </div>
          )}
          {error && <div className="rounded border border-destructive/20 bg-destructive/5 p-4 text-center text-xs text-red-500">{error}</div>}
          {success && <div className="rounded border border-emerald/20 bg-emerald/5 p-4 text-center text-xs text-emerald">{success}</div>}
          <div className="rounded border border-gold/10 bg-background p-4">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-gold">How it works</h4>
            <ol className="mt-2 space-y-1 text-[10px] text-emerald/60">
              <li>1. Contact your admin to request an activation PIN</li>
              <li>2. Admin will generate a unique 6-digit PIN for you</li>
              <li>3. Enter the PIN above and click "Activate Account"</li>
              <li>4. Your account will be activated instantly</li>
            </ol>
          </div>
        </>
      )}

      {tab === "my-pins" && (
        <div className="space-y-4">
          <div className="rounded border border-gold/20 bg-background p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Activate any account</h3>
            <p className="mt-1 text-[10px] text-emerald/60">Search inactive account by referral code / ID / email, then use a PIN from below.</p>
            <div className="mt-3 flex gap-2">
              <input value={targetCode} onChange={(e)=>setTargetCode(e.target.value)} placeholder="Enter referral code e.g. PR1234 or ID" className="flex-1 rounded border border-gold/20 px-3 py-2 text-sm outline-none focus:border-gold/40" />
              <button onClick={handleSearchUser} disabled={searching} className="rounded bg-emerald px-4 py-2 text-xs font-bold text-white hover:bg-emerald/90 disabled:opacity-40">
                {searching ? "..." : "Search"}
              </button>
            </div>
            {searchedUser && (
              <div className="mt-3 rounded border border-emerald/20 bg-emerald/5 p-3 text-xs">
                <p className="font-semibold">{searchedUser.name} ({searchedUser.referralCode})</p>
                <p className="text-[11px] text-emerald/60">{searchedUser.email} · {searchedUser.isActive ? "Active" : "Inactive"}</p>
                {searchedUser.isActive && <p className="text-[10px] text-red-500">Already active — cannot activate</p>}
              </div>
            )}
          </div>
          {pinsLoading ? <div className="text-center text-xs text-emerald/60 py-8">Loading...</div> : myPins.length===0 ? <div className="rounded border border-gold/10 bg-card p-12 text-center text-xs text-emerald/60">No PINs in your inbox. Ask admin or another user to send you one.</div> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myPins.map((p:any)=> (
                <div key={p.id} className="rounded border border-emerald/20 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-emerald tracking-widest">{p.pin}</span>
                    <button onClick={()=>copyPin(p.pin)} className="rounded border border-emerald/20 px-2 py-1 text-[10px] font-semibold uppercase text-emerald hover:bg-emerald/5">{copiedPin===p.pin?"Copied!":"Copy"}</button>
                  </div>
                  <p className="mt-1 text-[10px] text-emerald/50">From: {p.generatedBy ? `User #${p.generatedBy}` : "Admin"} · {new Date(p.createdAt).toLocaleDateString("en-IN")}</p>
                  <button onClick={()=>handleActivateTarget(p.pin)} disabled={!!targetActivating} className="mt-3 w-full rounded bg-gold px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream hover:bg-emerald disabled:opacity-40">
                    {targetActivating===p.pin ? "Activating..." : "Use to Activate"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="rounded border border-gold/20 bg-background overflow-hidden">
          <div className="border-b border-gold/10 px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Pins History</h3>
            <p className="text-[10px] text-emerald/60">Every PIN can be used only once. Shows when it was used and which account was activated.</p>
          </div>
          {pinsLoading ? <div className="p-8 text-center text-xs text-emerald/60">Loading...</div> : history.length===0 ? <div className="p-12 text-center text-xs text-emerald/60">No used PINs yet.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70"><th className="px-6 py-3 text-left">PIN</th><th className="px-6 py-3 text-left">Activated Account</th><th className="px-6 py-3 text-right">Used At</th></tr></thead>
                <tbody>
                  {history.map((p:any)=> (
                    <tr key={p.id} className="border-b border-gold/5">
                      <td className="px-6 py-3 font-mono text-sm text-emerald/60 line-through">{p.pin}</td>
                      <td className="px-6 py-3 text-xs">{p.usedByUser ? `${p.usedByUser.name} (${p.usedByUser.referralCode}) #${p.usedBy}` : `User #${p.usedBy}`}</td>
                      <td className="px-6 py-3 text-right text-[10px] text-emerald/60">{p.usedAt ? new Date(p.usedAt).toLocaleString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
