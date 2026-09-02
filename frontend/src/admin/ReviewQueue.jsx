import { useEffect, useState } from "react";
import { Check, X, MessageSquare } from "lucide-react";
import { api, canApproveContent, canRejectContent } from "./api";
import { resourceConfigs } from "./resourceConfigs";
import StatusBadge from "./StatusBadge";

export default function ReviewQueue() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState([]);
  const [reject, setReject] = useState(null); // { resource, id }
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const configs = Object.values(resourceConfigs);
      const fetched = await Promise.all(
        configs.map((config) =>
          api.getAll(config.resource, { status: "pending_review", limit: 100 }).catch(() => ({ data: [] }))
        )
      );
      const results = [];
      fetched.forEach((data, i) => {
        if (Array.isArray(data.data) && data.data.length) {
          results.push({ config: configs[i], items: data.data });
        }
      });
      setGroups(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = (item) => item.title || item.name || item._id;

  const act = async (action, resource, id, reason) => {
    setWorking(`${action}-${id}`);
    setError("");
    try {
      if (action === "reject") {
        await api.reject(resource, id, reason);
      } else {
        await api[action](resource, id);
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking("");
    }
  };

  const submitReject = async () => {
    if (!reject) return;
    if (!reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    await act("reject", reject.resource, reject.id, reason.trim());
    setReject(null);
    setReason("");
  };

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Review Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Content submitted for review. Approve to move it toward publishing, or reject to send it back.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
          {total} pending
        </span>
      </div>

      {error && <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="mt-6 space-y-6">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Nothing is pending review right now.
          </div>
        ) : (
          groups.map(({ config, items }) => (
            <div key={config.resource} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                {config.title}
              </div>
              <ul className="divide-y divide-gray-100">
                {items.map((item) => (
                  <li key={item._id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">{label(item)}</p>
                      <p className="truncate text-xs text-gray-400">
                        {item.category || item.date ? (item.category || new Date(item.date).toLocaleDateString()) : "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={item.status} />
                      {canApproveContent() && (
                        <button
                          onClick={() => act("approve", config.resource, item._id)}
                          disabled={working === `approve-${item._id}`}
                          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Check size={14} /> Approve
                        </button>
                      )}
                      {canRejectContent() && (
                        <button
                          onClick={() => setReject({ resource: config.resource, id: item._id })}
                          className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50"
                        >
                          <X size={14} /> Reject
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {reject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-red-600" />
              <h2 className="font-serif text-lg font-bold text-navy">Reject item</h2>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Provide a reason. The author can revise and re-submit.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Required reason..."
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-400"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setReject(null)} className="rounded-md px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={working === `reject-${reject.id}`}
                className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}