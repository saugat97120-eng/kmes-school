// Phase 11 — Facebook Publishing panel for the Review workspace.
//
// Publishing to Facebook is an explicit human action that requires:
//   content is CMS-published (workflow) + social.publish permission + explicit
//   human confirmation.
//
// AI can never trigger this. The panel shows a confirmation/preview
// (title, type, caption, media, target page, current workflow status) and only
// calls the backend after an explicit "Publish to Facebook" confirmation.
import { useState } from "react";
import { Share2, Loader2, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { api, canPublishSocial } from "./api";
import { resourceConfigs } from "./resourceConfigs";

export default function FacebookPublish({ type, id, item, onChanged }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  if (!canPublishSocial()) return null;
  // Only CMS-published content is eligible (backend enforces this too).
  if (item?.status !== "published") return null;

  const media = item?.src || item?.image || item?.attachments?.[0]?.url || null;

  const begin = () => {
    setCaption("");
    setResult(null);
    setError("");
    setConfirming(true);
  };

  const publish = async (allow) => {
    setPublishing(true);
    setError("");
    try {
      const res = await api.facebookPublish(type, id, caption, allow);
      setResult(res.data);
      setConfirming(false);
      onChanged?.();
    } catch (e) {
      setError(e.message || "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  };

  // Handle duplicate/already-published response (backend returns a message
  // containing "already published" and code duplicate_publish).
  const isDuplicate = error.toLowerCase().includes("already published");

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
          <Share2 size={14} /> Facebook Publishing
          {item?.facebookPublication && (
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-green-700">published</span>
          )}
        </span>
        <ChevronDown size={15} className={`text-blue-500 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-white p-4">
          <p className="mb-3 text-xs text-gray-500">
            Publishing to Facebook requires explicit human confirmation. Content must be CMS-published first.
            {item?.facebookPublication && (
              <>
                {" "}This content was previously published (<span className="font-mono text-xs">{item.facebookPublication.publishedId}</span>). Republishing is blocked unless you explicitly allow it.
              </>
            )}
          </p>

          {/* Preview */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-500">Publishing preview</p>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Title</dt><dd className="font-medium text-navy">{item?.title}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Type</dt><dd>{resourceConfigs[type]?.title || type}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">CMS workflow status</dt><dd className="font-semibold text-green-700">Published</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Target Page</dt><dd>Configured KMES Facebook Page</dd></div>
              {media && <div className="flex justify-between"><dt className="text-gray-500">Media</dt><dd className="max-w-[220px] truncate text-xs text-gray-400">{media}</dd></div>}
            </dl>
          </div>

          {!result && !confirming && (
            <button
              onClick={begin}
              className="mt-4 flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Share2 size={14} /> Publish to Facebook
            </button>
          )}

          {confirming && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-start gap-1.5 text-xs text-amber-800">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Confirm: this will create a new public post on the KMES Facebook Page. This is not reversible from here.
              </p>
              <label className="mt-3 block text-xs font-semibold text-gray-600">
                Caption (optional — defaults to the content title)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Optional caption sent to Facebook..."
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setConfirming(false)} className="rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={() => publish(false)}
                  disabled={publishing}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {publishing ? <><Loader2 size={12} className="animate-spin" /> Publishing…</> : <><Share2 size={12} /> Confirm & Publish</>}
                </button>
              </div>
            </div>
          )}

          {isDuplicate && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              This content already has a Facebook publication. To publish a new post (a duplicate), please recreate the post or republish intentionally from the server.
            </div>
          )}

          {result && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <div>
                Published to Facebook{result.republished ? " (republished)" : ""}: <span className="font-mono text-xs">{result.publishedId}</span> at {new Date(result.publishedAt).toLocaleString()}.
              </div>
            </div>
          )}

          {error && !isDuplicate && <p className="mt-3 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}