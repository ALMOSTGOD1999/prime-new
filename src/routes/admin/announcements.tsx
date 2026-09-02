import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from "../../functions/admin/announcements";

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncementsPage,
});

function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("normal");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title || !message) return alert("Title and message are required");
    setSending(true);
    try {
      const result = await createAnnouncement({ data: { title, message, priority } });
      alert(`Announcement sent to ${result.notifiedUsers} users!`);
      setTitle("");
      setMessage("");
      setPriority("normal");
      await loadAnnouncements();
    } catch (err: any) {
      alert(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await deleteAnnouncement({ data: { announcementId: id } });
      await loadAnnouncements();
    } catch {}
  };

  const priorityColors: Record<string, string> = {
    normal: "bg-blue-100 text-blue-700",
    important: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
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
        <span className="italic text-gold">Announcements</span>
      </h1>

      {/* Create Announcement */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Send New Announcement</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement message..."
              rows={4}
              className="w-full border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold resize-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-emerald/70">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="border-b border-gold/40 bg-transparent py-2 text-sm outline-none"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !title || !message}
              className="mt-4 bg-emerald px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send to All Users"}
            </button>
          </div>
        </div>
      </div>

      {/* Announcement History */}
      <div className="rounded border border-gold/20 bg-cream">
        <div className="border-b border-gold/10 px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">History</h3>
        </div>
        {announcements.length === 0 ? (
          <div className="p-12 text-center text-xs text-emerald/60">No announcements yet</div>
        ) : (
          <div className="divide-y divide-gold/5">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between px-6 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold">{a.title}</h4>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${priorityColors[a.priority]}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-emerald/60">{a.message}</p>
                  <p className="mt-1 text-[10px] text-emerald/50">{new Date(a.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <button onClick={() => handleDelete(a.id)} className="text-[10px] text-red-500 hover:text-red-700">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
