import { useEffect, useState } from "react";
import {
  RefreshCw,
  Plug,
  CheckCircle2,
  XCircle,
  Download,
  Inbox,
  AlertTriangle,
  ExternalLink,
  Clock,
} from "lucide-react";
import { api } from "./api";
import { resourceConfigs } from "./resourceConfigs";
import PermissionGate from "./PermissionGate";
import { PERMISSIONS } from "./permissions";

const TARGET_TYPES = Object.values(resourceConfigs).map((c) => c.resource);

function ConnBadge({ connected }) {
  if (connected)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
        <CheckCircle2 size={13} /> Connected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
      <XCircle size={13} /> Not Connected
    </span>
  );
}

export default function FacebookIntegration() {
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connection, setConnection] = useState(null); // {connected, pageName, reason}
  const [testing, setTesting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [preview, setPreview] = useState(null);
  const [targetType, setTargetType] = useState("notices");
  const [working, setWorking] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(10);

  const loadStatus = async () => {
    setLoadingStatus(true);
    setError("");
    try {
      const res = await api.facebookStatus();
      setStatus(res.data || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingStatus(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setError("");
    setConnection(null);
    try {
      const res = await api.facebookTestConnection();
      const d = res.data || {};
      if (d.connected) {
        setConnection({ connected: true });
        setStatus((s) => ({ ...(s || {}), configured: true, pageName: d.pageName }));
      } else {
        setConnection({ connected: false, reason: d.reason || "Connection failed" });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setTesting(false);
    }
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    setError("");
    setPosts([]);
    try {
      const res = await api.facebookPosts(limit);
      setPosts(res.data || []);
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPosts(false);
    }
  };

  const openPreview = async (postId) => {
    setError("");
    setPreview(null);
    try {
      const res = await api.facebookPreview(postId);
      setPreview(res.data || null);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const doImport = async () => {
    setWorking("import");
    setError("");
    setResult(null);
    const toImport = posts.filter((p) => selected.has(p.externalId));
    try {
      const res = await api.facebookImport(toImport, targetType);
      setResult(res);
      setSelected(new Set());
      await loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking("");
    }
  };

  const doSync = async () => {
    setWorking("sync");
    setError("");
    setResult(null);
    try {
      const res = await api.facebookSync(limit, targetType);
      setResult(res);
      await loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking("");
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configured = status?.configured;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Facebook Integration</h1>
          <p className="mt-1 text-sm text-gray-500">
            Import content from the Facebook Page as <strong>drafts</strong> for human review. Facebook never publishes to the website.
          </p>
        </div>
        <button
          onClick={loadStatus}
          className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-navy hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh Status
        </button>
      </div>

      {error && <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Connection status */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
              <Plug size={15} /> Connection Status
            </h2>
            <ConnBadge connected={configured === true} />
          </div>
          {loadingStatus ? (
            <p className="mt-4 text-sm text-gray-500">Loading…</p>
          ) : (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Configured</dt>
                <dd className="font-semibold text-navy">{configured === true ? "Yes" : "Not configured"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Page ID</dt>
                <dd className="font-medium text-gray-700">{configured === true ? "Configured" : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Last Connection Test</dt>
                <dd className="text-gray-700">
                  {status?.lastConnectionTest
                    ? `${status.lastConnectionTest.status} · ${new Date(status.lastConnectionTest.at).toLocaleString()}`
                    : "Never tested"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Last Sync</dt>
                <dd className="text-gray-700">
                  {status?.lastSync ? `${new Date(status.lastSync.at).toLocaleString()} · ${status.lastSync.imported} new` : "Never"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Last Error</dt>
                <dd className="max-w-[220px] truncate text-red-600">{status?.lastError || "None"}</dd>
              </div>
            </dl>
          )}
          {connection && !connection.connected && (
            <p className="mt-3 text-xs text-red-600">Connection could not be established. Check credentials.</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Actions</h2>
          <p className="mt-1 text-xs text-gray-400">
            Credentials are stored backend-only and never shown. All imported posts become drafts in the Content Inbox.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={testConnection}
              disabled={testing}
              className="flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-50"
            >
              {testing ? "Testing…" : "Test Connection"}
            </button>
            <PermissionGate permission={PERMISSIONS.SOCIAL_IMPORT}>
              <button
                onClick={doSync}
                disabled={working === "sync"}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Download size={14} /> {working === "sync" ? "Syncing…" : "Sync Facebook"}
              </button>
            </PermissionGate>
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Result</label>
            {result ? (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                Imported: <strong>{result.imported}</strong> · Skipped duplicates: <strong>{result.skippedDuplicates}</strong> ·{" "}
                Failed: <strong>{result.failed}</strong>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">No operation has run yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Preview / import */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
              <Inbox size={15} /> Facebook Posts (preview — nothing is published)
            </h2>
            <p className="mt-1 text-xs text-gray-400">Select posts, choose a target content type, then import as drafts.</p>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Latest</label>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Target Content Type</label>
              <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy">
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>{resourceConfigs[t]?.title || t}</option>
                ))}
              </select>
            </div>
            <button
              onClick={loadPosts}
              disabled={loadingPosts}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-navy hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={14} /> {loadingPosts ? "Loading…" : "Load Posts"}
            </button>
          </div>
        </div>

        {!configured && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Facebook is <strong>not configured</strong>. Set <code>FACEBOOK_PAGE_ID</code> and{" "}
              <code>FACEBOOK_PAGE_ACCESS_TOKEN</code> on the backend to import posts. The website continues to work normally without it.
            </span>
          </div>
        )}

        {loadingPosts ? (
          <div className="mt-4 p-8 text-center text-sm text-gray-500">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="mt-4 p-8 text-center text-sm text-gray-500">
            {configured ? "No posts loaded yet. Click “Load Posts” to preview recent Facebook posts." : "Posts are available once Facebook is configured."}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === posts.length && posts.length > 0}
                      onChange={() => {
                        if (selected.size === posts.length) setSelected(new Set());
                        else setSelected(new Set(posts.map((p) => p.externalId)));
                      }}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Post</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Media</th>
                  <th className="px-4 py-3 text-right font-semibold">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((p) => (
                  <tr key={p.externalId} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(p.externalId)} onChange={() => toggle(p.externalId)} className="h-4 w-4" />
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      <p className="line-clamp-2 text-gray-700">{p.message || "— no text —"}</p>
                      {p.permalink && (
                        <a href={p.permalink} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-navy hover:underline">
                          <ExternalLink size={11} /> View on Facebook
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.createdTime ? new Date(p.createdTime).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{p.hasMedia ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openPreview(p.externalId)} className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-2">
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PermissionGate permission={PERMISSIONS.SOCIAL_IMPORT}>
          <div className="mt-4 flex items-center justify-end gap-3">
            <span className="text-xs text-gray-500">{selected.size} selected</span>
            <button
              onClick={doImport}
              disabled={working === "import" || selected.size === 0}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Inbox size={15} /> {working === "import" ? "Importing…" : "Import as Draft"}
            </button>
          </div>
        </PermissionGate>
      </div>

      {/* Single-post preview */}
      {preview && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
              <Clock size={15} /> Post Preview
            </h3>
            <button onClick={() => setPreview(null)} className="text-xs font-semibold text-gray-400 hover:text-gray-600">
              Close
            </button>
          </div>
          <article className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
            <p className="text-xs text-gray-400">
              Posted {preview.createdTime ? new Date(preview.createdTime).toLocaleDateString() : "—"} · Source: Facebook
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{preview.message || "— no text —"}</p>
            {preview.permalink && (
              <a href={preview.permalink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline">
                <ExternalLink size={12} /> Facebook permalink
              </a>
            )}
            <p className="mt-3 text-xs text-gray-400">Target: {resourceConfigs[targetType]?.title || targetType} · Status: Draft (imported, never auto-published)</p>
          </article>
        </div>
      )}

      <PermissionGate permission={PERMISSIONS.SOCIAL_MANAGE}>
        <p className="mt-4 text-xs text-gray-400">
          Access: <code>social.view</code> to view, <code>social.import</code> to import/sync, <code>social.manage</code> to configure. Editors are not granted these by default.
        </p>
      </PermissionGate>
    </div>
  );
}