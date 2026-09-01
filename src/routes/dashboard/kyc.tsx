import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { submitKyc, getKycStatus } from "../../functions/user/kyc";

export const Route = createFileRoute("/dashboard/kyc")({
  component: KycPage,
});

function KycPage() {
  const [kycData, setKycData] = useState<any>(null);
  const [status, setStatus] = useState("not_submitted");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    panNumber: "",
    aadhaarNumber: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  });

  useEffect(() => {
    getKycStatus()
      .then((d) => {
        setKycData(d.kyc);
        setStatus(d.status);
        if (d.kyc) {
          setForm({
            panNumber: d.kyc.panNumber || "",
            aadhaarNumber: "",
            bankName: d.kyc.bankName || "",
            accountNumber: d.kyc.accountNumber || "",
            ifscCode: d.kyc.ifscCode || "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.panNumber || !form.aadhaarNumber || !form.bankName || !form.accountNumber || !form.ifscCode) {
      alert("All fields are required");
      return;
    }
    setSubmitting(true);
    try {
      await submitKyc({ data: form });
      alert("KYC submitted successfully!");
      const d = await getKycStatus();
      setKycData(d.kyc);
      setStatus(d.status);
    } catch (err: any) {
      alert(err.message || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    not_submitted: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-emerald/10 text-emerald",
    rejected: "bg-red-50 text-red-600",
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-cream" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        KYC <span className="italic text-gold">Verification</span>
      </h1>

      {/* Status Banner */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h3 className="text-sm font-semibold">Verification Status</h3>
            <span className={`mt-1 inline-block rounded px-3 py-1 text-xs font-bold uppercase ${statusColors[status]}`}>
              {status.replace("_", " ")}
            </span>
          </div>
        </div>
        {status === "rejected" && kycData?.rejectionReason && (
          <p className="mt-3 text-xs text-red-600">Reason: {kycData.rejectionReason}</p>
        )}
      </div>

      {/* KYC Form */}
      {status !== "approved" && (
        <div className="rounded border border-gold/20 bg-cream p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">
            {status === "pending" ? "Update KYC Details" : "Submit KYC Details"}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">PAN Number</label>
                <input
                  type="text"
                  value={form.panNumber}
                  onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm uppercase outline-none placeholder:text-emerald/60 focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">Aadhaar Number</label>
                <input
                  type="text"
                  value={form.aadhaarNumber}
                  onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value.replace(/\D/g, "") })}
                  placeholder="1234 5678 9012"
                  maxLength={12}
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">Bank Name</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="State Bank of India"
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">Account Number</label>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })}
                  placeholder="1234567890"
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">IFSC Code</label>
                <input
                  type="text"
                  value={form.ifscCode}
                  onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                  placeholder="SBIN0001234"
                  maxLength={11}
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm uppercase outline-none placeholder:text-emerald/60 focus:border-gold"
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : status === "pending" ? "Update Submission" : "Submit KYC"}
            </button>
          </div>
        </div>
      )}

      {/* KYC Info */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Why KYC?</h3>
        <ul className="space-y-2 text-xs text-emerald/70">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-gold">•</span>
            Required before first withdrawal to verify your identity
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-gold">•</span>
            Bank details used for processing withdrawal requests
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-gold">•</span>
            PAN card required for tax compliance
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-gold">•</span>
            Usually verified within 24-48 hours
          </li>
        </ul>
      </div>
    </div>
  );
}
