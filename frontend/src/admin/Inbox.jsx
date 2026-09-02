import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { api } from "./api";
import { resourceConfigs } from "./resourceConfigs";
import StatusBadge from "./StatusBadge";
import ReviewWorkspace from "./ReviewWorkspace";

const RESOURCE_TYPES = [
  "",
  ...Object.values(resourceConfigs).map((c) => c.resource),
];

const SOURCES = ["", "manual", "facebook_import", "ai_assisted"];

const SOURCE_LABEL = {
  manual: "Manual",
  facebook_import: "Facebook Import",
  ai_assisted: "AI Assisted",
};

const STATUS_ORDER = ["pending_review", "rejected", "draft", "approved", "published"];

function SourceBadge({ source }) {
  const map = {
    manual: "bg-gray-100 text-gray-600",
    facebook_import: "bg-indigo-50 text-indigo-700",
    ai_assisted: "bg-purple-50 text-purple-700",
  };
  if (!source || source === "manual") return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[source] || map.manual}`}>
      {SOURCE_LABEL[source] || "Manual"}
    </span>
  );
}

export default function Inbox() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // filters
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [q, setQ] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // review workspace
  const [selected, setSelected] = useState(null); // { type, id }

  const loadStats = async () => {
    try {
      const data = await api.inboxStats();
      setStats(data.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadList = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.inboxList({ status, type, source, q, createdBy, page, limit: 50 });
      setItems(data.data || []);
      setTotal(data.total ?? 0);
      setPages(data.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch the list when the user navigates pages (Prev/Next). Mirrors the
  // ResourceManager [resource, page] effect pattern.
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // debounce list on filter changes
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadList();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type, source, q, createdBy]);

  const statusCount = (s) => stats?.totals?.[s] ?? 0;
  const pendingCount = statusCount("pending_review");

  const openReview = (item) => setSelected({ type: item.type, _id: item._id });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Content Inbox</h1>
          <p className="mt-1 text-sm text-gray-500">
            Central workspace for everything needing attention across content types.
          </p>
        </div>
        <button
          onClick={() => {
            loadStats();
            loadList();
          }}
          className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-navy hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Counters */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_ORDER.map((s) => {
          const isPending = s === "pending_review";
          return (
            <button
              key={s}
              onClick={() => setStatus(status === s ? "" : s)}
              className={`rounded-2xl border bg-white p-4 text-left transition ${
                status === s ? "border-navy ring-2 ring-navy/10" : "border-gray-200 hover:border-gray-300"
              }`}
              title={`Filter by ${s}`}
            >
              <p className="text-2xl font-bold text-navy">{statusCount(s)}</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={s} />
                {isPending ? (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${pendingCount ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"}`}>
                    {pendingCount ? "!" : ""}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Search</label>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, description, content..."
              className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-navy"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy">
            <option value="">All types</option>
            {RESOURCE_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{resourceConfigs[t]?.title || t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy">
            {SOURCES.map((s) => (
              <option key={s || "any"} value={s}>{s ? SOURCE_LABEL[s] || s : "All sources"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Created by</label>
          <input
            type="text"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            placeholder="Author name"
            className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>
        <div className="ml-auto text-xs text-gray-400">{total} item(s)</div>
      </div>

      {/* List */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            {q || status || type || source || createdBy ? "No items match your filters." : "The inbox is empty."}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Created By</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={`${item.type}-${item._id}`} className="hover:bg-gray-50/60">
                  <td className="max-w-xs px-5 py-3">
                    <button onClick={() => openReview(item)} className="line-clamp-1 font-semibold text-navy hover:underline">
                      {item.title}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{resourceConfigs[item.type]?.title || item.type}</td>
                  <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-5 py-3"><SourceBadge source={item.source} /></td>
                  <td className="px-5 py-3 text-gray-600">{item.createdBy}</td>
                  <td className="px-5 py-3 text-gray-500">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => openReview(item)}
                      className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-2"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            <span>{total} total</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-gray-200 px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 py-1.5">Page {page} of {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="rounded-md border border-gray-200 px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {stats ? (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Counts by content type</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  {STATUS_ORDER.map((s) => <th key={s} className="px-3 py-2 text-right font-semibold">{s.replace("_", " ")}</th>)}
                  <th className="px-3 py-2 text-right font-semibold">Trashed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Object.values(resourceConfigs).map((c) => {
                  const row = stats.byType?.[c.resource];
                  return (
                    <tr key={c.resource}>
                      <td className="px-3 py-2 font-semibold text-navy">{c.title}</td>
                      {STATUS_ORDER.map((s) => (
                        <td key={s} className="px-3 py-2 text-right text-gray-700">{row?.[s] ?? 0}</td>
                      ))}
                      <td className="px-3 py-2 text-right text-gray-500">{row?.trashed ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {selected && (
        <ReviewWorkspace
          type={selected.type}
          id={selected._id}
          onClose={() => setSelected(null)}
          onChanged={() => {
            loadStats();
            loadList();
          }}
        />
      )}
    </div>
  );
}