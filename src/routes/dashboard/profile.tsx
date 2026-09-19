import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getProfile, updateProfile, changePassword } from "../../functions/user/profile";
import { getRankInfo } from "../../functions/user/rank";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

type Tab = "welcome" | "view" | "edit" | "password";

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [parent, setParent] = useState<any>(null);
  const [kyc, setKyc] = useState<any>(null);
  const [rankInfo, setRankInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("welcome");

  // Edit form state
  const [editEmail, setEditEmail] = useState("");
  const [editProfileImage, setEditProfileImage] = useState("");
  const [editDarkMode, setEditDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    Promise.all([getProfile(), getRankInfo()])
      .then(([profileData, rankData]) => {
        setUser(profileData.user);
        setParent(profileData.parent);
        setKyc(profileData.kyc);
        setRankInfo(rankData);
        setEditEmail(profileData.user.email || "");
        setEditProfileImage(profileData.user.profileImage || "");
        setEditDarkMode(profileData.user.darkMode || false);
      })
      .catch(() => navigate({ to: "/auth" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      await updateProfile({ data: { email: editEmail, profileImage: editProfileImage, darkMode: editDarkMode } });
      setUser({ ...user, email: editEmail, profileImage: editProfileImage, darkMode: editDarkMode });
      setSaveMsg("Profile updated successfully!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err: any) {
      setSaveMsg(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdMsg("");
    setPwdError("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwdError("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirm password do not match");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({ data: { currentPassword: oldPassword, newPassword } });
      setPwdMsg("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdMsg(""), 3000);
    } catch (err: any) {
      setPwdError(err.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "welcome", label: "Welcome" },
    { id: "view", label: "View Profile" },
    { id: "edit", label: "Update Profile" },
    { id: "password", label: "Change Password" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-10 w-full animate-pulse rounded bg-emerald/5" />
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-background" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="font-display text-3xl">
        My <span className="italic text-gold">Profile</span>
      </h1>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto rounded border border-gold/20 bg-background p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? "bg-gold text-cream"
                : "text-emerald/60 hover:bg-emerald/10 hover:text-emerald"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded border border-gold/20 bg-background p-6">

        {/* ── Welcome Tab ─────────────────────────────── */}
        {activeTab === "welcome" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald text-3xl font-bold text-cream">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <h2 className="font-display text-2xl text-gold">Welcome, {user?.name}!</h2>
                <p className="mt-1 text-sm text-emerald/70">
                  Your Member ID: <span className="font-bold text-emerald">{user?.referralCode}</span>
                </p>
                <p className="text-xs text-emerald/50">
                  {user?.isActive ? "Active Member" : "Inactive Member"} • Joined {new Date(user?.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-gold/10 bg-emerald/5 p-4">
              <p className="text-sm text-emerald/80">
                Welcome to Prime Jewellery! You are part of the team as <span className="font-bold text-gold">{user?.position || "Root"}</span> under <span className="font-bold text-emerald">{parent ? parent.name : "N/A"}</span>.
                Your current rank is <span className="font-bold text-gold uppercase">{rankInfo?.currentRankLabel}</span> with a team of <span className="font-bold text-emerald">{rankInfo?.teamSize}</span> members.
              </p>
            </div>
          </div>
        )}

        {/* ── View Profile Tab ────────────────────────── */}
        {activeTab === "view" && (
          <div className="space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Personal Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full Name" value={user?.name} />
                <Field label="Email" value={user?.email} />
                <Field label="Phone" value={user?.phone || "Not set"} />
                <Field label="Member ID" value={user?.referralCode} />
                <Field label="Position" value={user?.position ? user.position.charAt(0).toUpperCase() + user.position.slice(1) : "Root"} />
                <Field label="Parent" value={parent ? `${parent.name} (${parent.referralCode})` : "Root User"} />
                <Field label="Joined" value={new Date(user?.createdAt).toLocaleDateString("en-IN")} />
                <Field label="Status" value={user?.isActive ? "Active" : "Inactive"} />
              </div>
            </div>

            {/* Business Info */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Business Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Rank" value={rankInfo?.currentRankLabel} />
                <Field label="Team Size" value={`${rankInfo?.teamSize} members`} />
                <Field label="Total Business" value={`₹${(user?.packageAmount || 0).toLocaleString("en-IN")}`} />
                <Field label="Total Invested" value={`₹${(user?.totalInvested || 0).toLocaleString("en-IN")}`} />
              </div>
            </div>

            {/* KYC / Bank Info */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">KYC & Bank Details</h3>
              {kyc ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="PAN Number" value={kyc.panNumber || "Not submitted"} />
                  <Field label="Aadhaar Number" value={kyc.aadhaarNumber ? "••••" + kyc.aadhaarNumber.slice(-4) : "Not submitted"} />
                  <Field label="Bank Name" value={kyc.bankName || "Not submitted"} />
                  <Field label="Account Number" value={kyc.accountNumber ? "••••" + kyc.accountNumber.slice(-4) : "Not submitted"} />
                  <Field label="IFSC Code" value={kyc.ifscCode || "Not submitted"} />
                  <Field label="KYC Status" value={kyc.status?.charAt(0).toUpperCase() + kyc.status?.slice(1)} />
                </div>
              ) : (
                <p className="text-sm text-emerald/50">No KYC information submitted yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Update Profile Tab ──────────────────────── */}
        {activeTab === "edit" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gold/10 bg-emerald/5 p-3">
              <p className="text-xs text-emerald/70">
                You can update your email, profile image, and dark mode preference. Name, phone, bank details, and PAN cannot be changed.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-emerald/70">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-emerald/70">Profile Image URL</label>
                <input
                  type="text"
                  value={editProfileImage}
                  onChange={(e) => setEditProfileImage(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/40 focus:border-gold"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs uppercase tracking-widest text-emerald/70">Dark Mode</label>
                <button
                  onClick={() => setEditDarkMode(!editDarkMode)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${editDarkMode ? "bg-gold" : "bg-emerald/20"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${editDarkMode ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            </div>

            {saveMsg && (
              <p className={`text-xs font-semibold ${saveMsg.includes("success") ? "text-emerald" : "text-red-500"}`}>
                {saveMsg}
              </p>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-emerald px-6 py-2 text-xs font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {/* ── Change Password Tab ─────────────────────── */}
        {activeTab === "password" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-emerald/70">Old Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-emerald/70">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/40 focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-emerald/70">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/40 focus:border-gold"
                />
              </div>
            </div>

            {pwdError && <p className="text-xs font-semibold text-red-500">{pwdError}</p>}
            {pwdMsg && <p className="text-xs font-semibold text-emerald">{pwdMsg}</p>}

            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
              className="bg-emerald px-6 py-2 text-xs font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Reusable field component ─────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-emerald/70">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
