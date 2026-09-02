import { useEffect, useState } from "react";
import { Mail, Archive, ArchiveRestore, CheckCheck, Trash2 } from "lucide-react";
import { api, canManageMessages } from "./api";

const tabs = [
  { key: "active", label: "Active" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
];

function AdminMessages() {
  const [tab, setTab] = useState("active");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .getMessages(tab)
      .then((data) => setMessages(data.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const updateMessage = async (id, payload) => {
    try {
      await api.updateMessage(id, payload);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this message? This cannot be undone.")) return;
    try {
      await api.deleteMessage(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy">Contact Messages</h1>
      <p className="mt-1 text-sm text-gray-500">
        Messages submitted through the website contact form.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="mt-5 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold ${
              tab === t.key
                ? "border-b-2 border-navy text-navy"
                : "text-gray-500 hover:text-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            No messages here.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m._id}
              className={`rounded-2xl border bg-white p-6 ${
                !m.read ? "border-gold/50" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 font-serif text-lg font-bold text-navy">
                    {!m.read && <span className="h-2 w-2 rounded-full bg-gold" />}
                    {m.subject}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {m.name} &lt;{m.email}&gt; {m.phone ? `· ${m.phone}` : ""}
                  </p>
                </div>
                <span className="flex items-center gap-1 whitespace-nowrap text-xs text-gray-400">
                  <Mail size={13} /> {new Date(m.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-600">{m.message}</p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-50 pt-4">
                {!m.read ? (
                  <button
                    onClick={() => updateMessage(m._id, { read: true })}
                    className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <CheckCheck size={13} /> Mark Read
                  </button>
                ) : (
                  <button
                    onClick={() => updateMessage(m._id, { read: false })}
                    className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    Mark Unread
                  </button>
                )}
                <a
                  href={`mailto:${m.email}?subject=RE: ${encodeURIComponent(m.subject)}`}
                  className="flex items-center gap-1.5 rounded-md bg-navy/10 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/20"
                >
                  Reply by Email
                </a>
                {!m.archived ? (
                  <button
                    onClick={() => updateMessage(m._id, { archived: true })}
                    className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <Archive size={13} /> Archive
                  </button>
                ) : (
                  <button
                    onClick={() => updateMessage(m._id, { archived: false })}
                    className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <ArchiveRestore size={13} /> Unarchive
                  </button>
                )}
                {canManageMessages() && (
                  <button
                    onClick={() => handleDelete(m._id)}
                    className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminMessages;
