import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { api } from "./api";

const actionVerbs = {
  create: "created",
  update: "updated",
  delete: "moved to trash",
  restore: "restored",
  permanent_delete: "permanently deleted",
  publish: "published",
  unpublish: "unpublished",
  upload: "uploaded",
  user_create: "added user",
  user_update: "updated user",
  user_delete: "removed user",
  settings_update: "updated site settings",
  login: "logged in",
};

const actionColors = {
  create: "bg-green-50 text-green-700",
  update: "bg-blue-50 text-blue-700",
  delete: "bg-red-50 text-red-600",
  restore: "bg-amber-50 text-amber-700",
  permanent_delete: "bg-red-100 text-red-700",
  publish: "bg-green-50 text-green-700",
  unpublish: "bg-gray-100 text-gray-600",
  upload: "bg-purple-50 text-purple-700",
};

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    api
      .getActivityLogs({ page, limit: 30 })
      .then((data) => {
        setLogs(data.data || []);
        setPages(data.pages || 1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-navy">
        <ScrollText size={22} /> Activity Logs
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        A record of every create, update, delete, and publish action taken by admins and editors.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No activity recorded yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Time</th>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Resource</th>
                <th className="px-5 py-3 font-semibold">Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 font-semibold text-navy">{log.userName}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        actionColors[log.action] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {actionVerbs[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{log.resource}</td>
                  <td className="px-5 py-3 text-gray-600">{log.resourceLabel || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            <button
              disabled={page <= 1}
              onClick={() => {
                setLoading(true);
                setPage((p) => Math.max(1, p - 1));
              }}
              className="rounded-md border border-gray-200 px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-2 py-1.5">Page {page} of {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => {
                setLoading(true);
                setPage((p) => Math.min(pages, p + 1));
              }}
              className="rounded-md border border-gray-200 px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityLogs;
