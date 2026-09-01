import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getNotifications, markNotificationRead, markAllRead } from "../../functions/user/notifications";

export const Route = createFileRoute("/dashboard/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const playNotificationSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead({ data: { notificationId: id } });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const typeIcons: Record<string, string> = {
    referral: "👤",
    pair_match: "🤝",
    commission: "💰",
    award: "🏆",
    withdrawal: "💸",
    kyc: "📋",
    rank: "⭐",
    general: "📢",
  };

  const typeColors: Record<string, string> = {
    referral: "bg-emerald/10 text-emerald",
    pair_match: "bg-gold/10 text-gold",
    commission: "bg-emerald/10 text-emerald",
    award: "bg-yellow-100 text-yellow-700",
    withdrawal: "bg-blue-100 text-blue-700",
    kyc: "bg-purple-100 text-purple-700",
    rank: "bg-orange-100 text-orange-700",
    general: "bg-gray-100 text-gray-700",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">
            <span className="italic text-gold">Notifications</span>
          </h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-xs text-emerald/70">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="border border-emerald/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-emerald/10"
          >
            Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded border border-gold/20 bg-cream p-12 text-center">
          <p className="text-4xl">🔔</p>
          <p className="mt-4 text-xs text-emerald/60">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkRead(n.id)}
              className={`flex items-start gap-4 rounded border p-4 transition-all ${
                n.isRead
                  ? "border-gold/10 bg-cream/50"
                  : "border-gold/30 bg-cream cursor-pointer hover:border-gold/50"
              }`}
            >
              <span className="text-2xl">{typeIcons[n.type] || "📢"}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-semibold ${n.isRead ? "text-emerald/70" : "text-emerald"}`}>
                    {n.title}
                  </h3>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-gold" />}
                </div>
                <p className="mt-1 text-xs text-emerald/60">{n.message}</p>
                <p className="mt-1 text-[10px] text-emerald/50">
                  {new Date(n.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${typeColors[n.type] || "bg-gray-100 text-gray-700"}`}>
                {n.type.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
