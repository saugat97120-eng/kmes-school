import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Megaphone,
  CalendarDays,
  Image,
  Award,
  Building2,
  Activity as ActivityIcon,
  Mail,
  Plus,
  Upload,
  FileText,
  Clock,
} from "lucide-react";
import { api } from "./api";

const contentCards = [
  { key: "notices", label: "Notices", to: "/admin/notices", icon: Megaphone },
  { key: "events", label: "Events", to: "/admin/events", icon: CalendarDays },
  { key: "activities", label: "Activities", to: "/admin/activities", icon: ActivityIcon },
  { key: "achievements", label: "Achievements", to: "/admin/achievements", icon: Award },
  { key: "facilities", label: "Facilities", to: "/admin/facilities", icon: Building2 },
  { key: "gallery", label: "Gallery Photos", to: "/admin/gallery", icon: Image },
];

const quickActions = [
  { label: "New Notice", to: "/admin/notices", icon: Plus },
  { label: "New Event", to: "/admin/events", icon: Plus },
  { label: "Upload Photos", to: "/admin/media", icon: Upload },
  { label: "Edit Pages", to: "/admin/pages", icon: FileText },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const actionVerbs = {
  create: "created",
  update: "updated",
  delete: "moved to trash",
  restore: "restored",
  permanent_delete: "permanently deleted",
  publish: "published",
  unpublish: "unpublished",
  upload: "uploaded",
  user_create: "added a user",
  user_update: "updated a user",
  user_delete: "removed a user",
  settings_update: "updated site settings",
  login: "logged in",
};

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getDashboardStats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage all content published on the KMES website.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        {quickActions.map((qa) => (
          <Link
            key={qa.label}
            to={qa.to}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <qa.icon size={15} /> {qa.label}
          </Link>
        ))}
      </div>

      {/* Content stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contentCards.map((c) => {
          const s = stats?.content?.[c.key];
          return (
            <Link
              key={c.key}
              to={c.to}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-gold">
                <c.icon size={20} />
              </div>
              <p className="mt-4 text-2xl font-bold text-navy">{s ? s.total : "..."}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
              {s && (
                <p className="mt-1 text-xs text-gray-400">
                  {s.published} published · {s.draft} draft
                  {s.trashed ? ` · ${s.trashed} in trash` : ""}
                </p>
              )}
            </Link>
          );
        })}

        <Link
          to="/admin/messages"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-gold">
            <Mail size={20} />
          </div>
          <p className="mt-4 text-2xl font-bold text-navy">
            {stats ? stats.messages.total : "..."}
          </p>
          <p className="text-sm text-gray-500">Contact Messages</p>
          {stats && (
            <p className="mt-1 text-xs text-gray-400">{stats.messages.unread} unread</p>
          )}
        </Link>
      </div>

      {/* Recent activity + Upcoming events + Recent messages */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-serif text-base font-bold text-navy">
            <Clock size={16} /> Recent Activity
          </h2>
          <div className="mt-4 space-y-3">
            {!stats ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : !stats.recentActivity?.length ? (
              <p className="text-sm text-gray-400">No activity recorded yet.</p>
            ) : (
              stats.recentActivity.map((log) => (
                <div key={log._id} className="flex items-start justify-between border-b border-gray-50 pb-3 text-sm last:border-0 last:pb-0">
                  <span className="text-gray-700">
                    <span className="font-semibold text-navy">{log.userName}</span>{" "}
                    {actionVerbs[log.action] || log.action}
                    {log.resourceLabel ? (
                      <>
                        {" "}
                        <span className="text-gray-500">&ldquo;{log.resourceLabel}&rdquo;</span>
                      </>
                    ) : null}{" "}
                    in <span className="text-gray-500">{log.resource}</span>
                  </span>
                  <span className="shrink-0 pl-3 text-xs text-gray-400">{timeAgo(log.createdAt)}</span>
                </div>
              ))
            )}
          </div>
          {stats?.recentActivity?.length > 0 && (
            <Link to="/admin/activity-logs" className="mt-4 inline-block text-xs font-semibold text-navy hover:underline">
              View all activity →
            </Link>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-serif text-base font-bold text-navy">Upcoming Events</h2>
            <div className="mt-3 space-y-3">
              {!stats ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : !stats.upcomingEvents?.length ? (
                <p className="text-sm text-gray-400">No upcoming events.</p>
              ) : (
                stats.upcomingEvents.map((ev) => (
                  <div key={ev._id} className="text-sm">
                    <p className="font-semibold text-navy">{ev.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(ev.date).toLocaleDateString()} {ev.location ? `· ${ev.location}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-serif text-base font-bold text-navy">Recent Messages</h2>
            <div className="mt-3 space-y-3">
              {!stats ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : !stats.recentMessages?.length ? (
                <p className="text-sm text-gray-400">No messages yet.</p>
              ) : (
                stats.recentMessages.map((m) => (
                  <Link key={m._id} to="/admin/messages" className="block text-sm">
                    <p className="flex items-center gap-2 font-semibold text-navy">
                      {!m.read && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                      {m.subject}
                    </p>
                    <p className="text-xs text-gray-500">{m.name} · {timeAgo(m.createdAt)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
