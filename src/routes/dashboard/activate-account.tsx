import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { activateWithPin } from "../../functions/user/activate-with-pin";
import { getDashboard } from "../../functions/user/dashboard";

export const Route = createFileRoute("/dashboard/activate-account")({
  component: ActivateAccount,
});

function ActivateAccount() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setUser)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.isActive) {
      setSuccess("Your account is already active!");
    }
  }, [user]);

  const handleActivate = async () => {
    setError(null);
    setSuccess(null);

    if (!pin || pin.length !== 6) {
      setError("Please enter a valid 6-digit PIN");
      return;
    }

    setActivating(true);
    try {
      const result = await activateWithPin({ data: { pin } });
      setSuccess(result.message);
      setPin("");
    } catch (err: any) {
      setError(err.message || "Activation failed. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm uppercase tracking-widest text-emerald/70">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">
          Activate <span className="italic text-gold">Account</span>
        </h1>
        <p className="mt-1 text-[10px] sm:text-xs text-emerald/70">
          Enter a 6-digit activation PIN provided by your admin to activate your account.
        </p>
      </div>

      {user?.isActive ? (
        <div className="rounded border border-emerald/20 bg-emerald/5 p-6 text-center">
          <div className="text-4xl">✅</div>
          <h3 className="mt-3 font-display text-lg text-emerald">Account Active</h3>
          <p className="mt-1 text-xs text-emerald/60">
            Your account is already activated and ready to use.
          </p>
        </div>
      ) : (
        <div className="rounded border border-gold/20 bg-background p-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
            Enter Activation PIN
          </h3>
          <p className="mt-1 text-[10px] text-emerald/60">
            Get the PIN from your admin, then enter it below.
          </p>

          <div className="mt-4">
            <input
              type="text"
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPin(val);
                setError(null);
              }}
              placeholder="Enter 6-digit PIN"
              className="w-full border-b border-gold/40 bg-transparent py-3 text-center font-mono text-2xl tracking-[0.3em] text-emerald outline-none placeholder:text-emerald/30 focus:border-gold"
              disabled={activating}
            />
          </div>

          <button
            onClick={handleActivate}
            disabled={activating || pin.length !== 6}
            className="mt-6 w-full bg-gold px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-40"
          >
            {activating ? "Activating..." : "Activate Account"}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded border border-destructive/20 bg-destructive/5 p-4 text-center text-xs text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded border border-emerald/20 bg-emerald/5 p-4 text-center text-xs text-emerald">
          {success}
        </div>
      )}

      <div className="rounded border border-gold/10 bg-background p-4">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest text-gold">
          How it works
        </h4>
        <ol className="mt-2 space-y-1 text-[10px] text-emerald/60">
          <li>1. Contact your admin to request an activation PIN</li>
          <li>2. Admin will generate a unique 6-digit PIN for you</li>
          <li>3. Enter the PIN above and click "Activate Account"</li>
          <li>4. Your account will be activated instantly</li>
        </ol>
      </div>
    </div>
  );
}
