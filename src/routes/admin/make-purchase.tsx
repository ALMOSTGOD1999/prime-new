import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  adminSearchUsers,
  adminPreviewPurchase,
  adminCreatePurchaseWeight,
  adminCreatePurchaseAmount,
} from "../../functions/admin/purchases";
import { generatePurchaseBill } from "../../lib/pdf-bill";

export const Route = createFileRoute("/admin/make-purchase")({
  component: MakePurchasePage,
});

function MakePurchasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [method, setMethod] = useState<"weight" | "amount">("weight");
  const [carat, setCarat] = useState<18 | 22 | 24>(22);
  const [weight, setWeight] = useState("");
  const [amount, setAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const data = await adminSearchUsers({ data: { query: searchQuery } });
      setSearchResults(data.users || []);
    } catch (err: any) {
      alert(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handlePreview = async () => {
    if (method === "weight") {
      const w = parseFloat(weight);
      if (!w || w <= 0) return alert("Enter a valid weight");
      setPreviewLoading(true);
      try {
        const data = await adminPreviewPurchase({ data: { carat, weight: w } });
        setPreview(data);
      } catch (err: any) {
        alert(err.message || "Preview failed");
      } finally {
        setPreviewLoading(false);
      }
    } else {
      const a = parseInt(amount, 10);
      if (!a || a < 10000) return alert("Minimum purchase is ₹10,000");
      setPreview({ total: a, packageName: "Auto", monthlyReturnPct: 3, monthlyReturnAmount: Math.round(a * 0.03) });
    }
  };

  const handleCreate = async () => {
    if (!selectedUser) return alert("Select a user first");
    if (!confirm(`Create purchase for ${selectedUser.name}?`)) return;

    setCreateLoading(true);
    try {
      let result;
      if (method === "weight") {
        const w = parseFloat(weight);
        if (!w || w <= 0) throw new Error("Enter valid weight");
        result = await adminCreatePurchaseWeight({
          data: { targetUserId: selectedUser.id, carat, weight: w, adminNote: adminNote || undefined },
        });
      } else {
        const a = parseInt(amount, 10);
        if (!a || a < 10000) throw new Error("Minimum purchase is ₹10,000");
        result = await adminCreatePurchaseAmount({
          data: { targetUserId: selectedUser.id, amount: a, adminNote: adminNote || undefined },
        });
      }

      alert(`Purchase created!\nID: #${result.purchaseId}\nTotal: ₹${result.totalAmount.toLocaleString("en-IN")}\nMonthly Return: ₹${result.monthlyReturnAmount.toLocaleString("en-IN")}`);

      // Auto-generate PDF bill
      try {
        generatePurchaseBill({
          purchaseId: result.purchaseId,
          carat: method === "weight" ? carat : 0,
          weight: method === "weight" ? parseFloat(weight) : undefined,
          goldRatePerGram: preview?.effectiveRate,
          goldValue: preview?.goldValue,
          makingCharges: preview?.makingCharges,
          gst: preview?.gst,
          hallmarkCharges: preview?.hallmarkCharges,
          totalAmount: result.totalAmount,
          status: "approved",
          createdAt: new Date().toISOString(),
          userName: selectedUser.name,
          userEmail: selectedUser.email,
          userId: selectedUser.id,
          monthlyReturnAmount: result.monthlyReturnAmount,
          monthlyReturnPct: preview?.monthlyReturnPct,
          packageName: preview?.packageName,
        });
      } catch { /* PDF generation is best-effort */ }

      // Reset
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);
      setWeight("");
      setAmount("");
      setAdminNote("");
      setPreview(null);
    } catch (err: any) {
      alert(err.message || "Failed to create purchase");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">
          Make <span className="italic text-gold">Purchase</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/60">
          Create a gold purchase on behalf of any user
        </p>
      </div>

      {/* Step 1: Search User */}
      <div className="rounded-xl border border-gold/10 bg-background p-6 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold">
          Step 1 — Select User
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name, email, referral code, or ID..."
            className="flex-1 rounded-lg border border-gold/20 bg-card px-4 py-2.5 text-sm outline-none transition-all placeholder:text-emerald/40 focus:border-gold/40 focus:ring-2 focus:ring-gold/10"
          />
          <button
            onClick={handleSearch}
            disabled={searching || searchQuery.length < 2}
            className="rounded-lg bg-emerald px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-cream transition-all hover:bg-emerald/90 disabled:opacity-50"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {selectedUser && (
          <div className="mt-4 rounded-lg border border-gold/20 bg-gold/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">
                  {selectedUser.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedUser.name}</p>
                  <p className="text-xs text-emerald/60">
                    {selectedUser.email} • {selectedUser.referralCode} • {selectedUser.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-xs text-red-500 hover:text-red-700">
                Change
              </button>
            </div>
          </div>
        )}

        {!selectedUser && searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => { setSelectedUser(u); setSearchResults([]); setSearchQuery(""); }}
                className="flex w-full items-center gap-3 rounded-lg border border-gold/10 p-3 text-left transition-all hover:border-gold/30 hover:bg-gold/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald/10 text-[11px] font-bold text-emerald">
                  {u.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{u.name}</p>
                  <p className="truncate text-xs text-emerald/60">{u.email} • {u.referralCode}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold ${u.isActive ? "text-emerald" : "text-red-500"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </p>
                  <p className="text-xs text-emerald/60">₹{(u.totalInvested || 0).toLocaleString("en-IN")}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <>
          {/* Step 2: Purchase Method */}
          <div className="rounded-xl border border-gold/10 bg-background p-6 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold">
              Step 2 — Purchase Method
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => { setMethod("weight"); setPreview(null); }}
                className={`flex-1 rounded-lg border p-4 text-center transition-all ${
                  method === "weight"
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-gold/20 text-emerald/60 hover:border-gold/40"
                }`}
              >
                <p className="font-display text-lg">Weight-based</p>
                <p className="mt-1 text-xs text-emerald/60">Carat + Weight → Auto billing</p>
              </button>
              <button
                onClick={() => { setMethod("amount"); setPreview(null); }}
                className={`flex-1 rounded-lg border p-4 text-center transition-all ${
                  method === "amount"
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-gold/20 text-emerald/60 hover:border-gold/40"
                }`}
              >
                <p className="font-display text-lg">Amount-based</p>
                <p className="mt-1 text-xs text-emerald/60">Direct amount entry</p>
              </button>
            </div>
          </div>

          {/* Step 3: Enter Details */}
          <div className="rounded-xl border border-gold/10 bg-background p-6 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold">
              Step 3 — Enter Details
            </h3>

            {method === "weight" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-widest text-emerald/70">Carat</label>
                  <div className="flex gap-2">
                    {([18, 22, 24] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCarat(c)}
                        className={`flex-1 rounded-lg border p-3 text-center text-sm transition-all ${
                          carat === c
                            ? "border-gold bg-gold/10 text-gold font-semibold"
                            : "border-gold/20 text-emerald/60 hover:border-gold/40"
                        }`}
                      >
                        {c}K
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-widest text-emerald/70">Weight (grams)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={weight}
                    onChange={(e) => { setWeight(e.target.value); setPreview(null); }}
                    placeholder="Enter weight in grams"
                    className="w-full rounded-lg border border-gold/20 bg-card px-4 py-2.5 text-sm outline-none transition-all placeholder:text-emerald/40 focus:border-gold/40 focus:ring-2 focus:ring-gold/10"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-xs uppercase tracking-widest text-emerald/70">Amount (₹)</label>
                <input
                  type="number"
                  min="10000"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setPreview(null); }}
                  placeholder="Minimum ₹10,000"
                  className="w-full rounded-lg border border-gold/20 bg-card px-4 py-2.5 text-sm outline-none transition-all placeholder:text-emerald/40 focus:border-gold/40 focus:ring-2 focus:ring-gold/10"
                />
              </div>
            )}

            <div className="mt-4">
              <label className="mb-2 block text-xs uppercase tracking-widest text-emerald/70">Admin Note (optional)</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Manual purchase for offline payment"
                className="w-full rounded-lg border border-gold/20 bg-card px-4 py-2.5 text-sm outline-none transition-all placeholder:text-emerald/40 focus:border-gold/40 focus:ring-2 focus:ring-gold/10"
              />
            </div>

            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="mt-4 w-full rounded-lg border border-emerald/40 bg-emerald/5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-emerald transition-all hover:bg-emerald/10 disabled:opacity-50"
            >
              {previewLoading ? "Computing..." : "Preview Billing"}
            </button>
          </div>

          {/* Billing Preview + Confirm */}
          {preview && (
            <div className="rounded-xl border-2 border-gold/40 bg-gold/5 p-6 shadow-sm">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold">Billing Summary</h3>

              {method === "weight" && (
                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between"><span className="text-emerald/70">Carat</span><span className="font-semibold">{preview.carat}K</span></div>
                  <div className="flex justify-between"><span className="text-emerald/70">Weight</span><span className="font-semibold">{preview.weight}g</span></div>
                  <div className="flex justify-between"><span className="text-emerald/70">Gold Rate/g</span><span className="font-semibold">₹{preview.effectiveRate?.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-emerald/70">Gold Value</span><span className="font-semibold">₹{preview.goldValue?.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-emerald/70">Making (8%)</span><span className="font-semibold">₹{preview.makingCharges?.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-emerald/70">GST (18%)</span><span className="font-semibold">₹{preview.gst?.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-emerald/70">Hallmark</span><span className="font-semibold">₹{preview.hallmarkCharges?.toLocaleString("en-IN")}</span></div>
                </div>
              )}

              <div className="border-t border-gold/20 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount</span>
                  <span className="font-display text-gold">₹{preview.total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-emerald/20 bg-emerald/5 p-4">
                <p className="text-xs uppercase tracking-widest text-emerald/70">Monthly Return</p>
                <p className="mt-1 font-display text-2xl text-emerald">₹{preview.monthlyReturnAmount.toLocaleString("en-IN")}</p>
                <p className="text-xs text-emerald/60">{preview.monthlyReturnPct}% per month • {preview.packageName}</p>
              </div>

              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="mt-4 w-full rounded-lg bg-gold py-3 text-xs font-semibold uppercase tracking-[0.15em] text-cream shadow-sm transition-all hover:bg-gold/90 disabled:opacity-50"
              >
                {createLoading ? "Creating..." : `Create Purchase for ${selectedUser.name}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
