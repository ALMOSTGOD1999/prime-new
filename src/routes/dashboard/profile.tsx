import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getProfile, updateProfile, changePassword } from "../../functions/user/profile";
import { getRankInfo } from "../../functions/user/rank";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [parent, setParent] = useState<any>(null);
  const [rankInfo, setRankInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    Promise.all([getProfile(), getRankInfo()])
      .then(([profileData, rankData]) => {
        setUser(profileData.user);
        setParent(profileData.parent);
        setRankInfo(rankData);
        setName(profileData.user.name);
        setPhone(profileData.user.phone || "");
      })
      .catch(() => navigate({ to: "/auth" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ data: { name, phone } });
      setUser({ ...user, name, phone });
      setEditing(false);
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      alert("Please fill in both password fields");
      return;
    }
    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({ data: { currentPassword, newPassword } });
      alert("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setShowPassword(false);
    } catch (err: any) {
      alert(err.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const rankColors: Record<string, string> = {
    bronze: "bg-orange-100 text-orange-700 border-orange-300",
    silver: "bg-gray-100 text-gray-700 border-gray-300",
    gold: "bg-yellow-100 text-yellow-700 border-yellow-300",
    platinum: "bg-purple-100 text-purple-700 border-purple-300",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-cream" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl">
        My <span className="italic text-gold">Profile</span>
      </h1>

      {/* Profile Card */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald text-2xl font-bold text-cream">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <h2 className="font-display text-2xl">{user?.name}</h2>
                <p className="text-xs text-emerald/70">{user?.email}</p>
                <p className="text-[10px] uppercase tracking-widest text-emerald/60">{user?.referralCode}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="border border-emerald/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-emerald/10"
          >
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {editing ? (
          <div className="mt-6 space-y-4 border-t border-gold/10 pt-6">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-emerald px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gold/10 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald/70">Phone</p>
              <p className="mt-1 text-sm">{user?.phone || "Not set"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald/70">Position</p>
              <p className="mt-1 text-sm capitalize">{user?.position || "Root"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald/70">Parent</p>
              <p className="mt-1 text-sm">{parent ? `${parent.name} (${parent.referralCode})` : "Root user"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald/70">Member Since</p>
              <p className="mt-1 text-sm">{new Date(user?.createdAt).toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Rank Card */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Rank & Progress</h3>
        <div className="flex items-center gap-4">
          <div className={`rounded-lg border px-4 py-2 text-sm font-bold uppercase ${rankColors[rankInfo?.currentRank || "bronze"]}`}>
            {rankInfo?.currentRankLabel}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] text-emerald/70">
              <span>Team: {rankInfo?.teamSize} members</span>
              {rankInfo?.nextRank && <span>Next: {rankInfo?.nextRankLabel} ({rankInfo?.nextThreshold})</span>}
            </div>
            <div className="mt-2 h-2 rounded-full bg-emerald/10">
              <div
                className="h-2 rounded-full bg-gold transition-all"
                style={{ width: `${rankInfo?.progress || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword}
            className="bg-emerald px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
          >
            {changingPassword ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
