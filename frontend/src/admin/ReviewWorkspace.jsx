import { useEffect, useState } from "react";
import { X, Check, MessageSquare, Paperclip, Clock, ExternalLink } from "lucide-react";
import { api, canApproveContent, canRejectContent } from "./api";
import { resourceConfigs } from "./resourceConfigs";
import StatusBadge from "./StatusBadge";
import AIAssist from "./AIAssist";
import FacebookPublish from "./FacebookPublish";

const ACTION_LABEL = {
  create: "Created",
  update: "Edited",
  submit: "Submitted",
  review: "Reviewed",
  approve: "Approved",
  reject: "Rejected",
  publish: "Published",
  unpublish: "Unpublished",
  delete: "Deleted",
  restore: "Restored",
};

export default function ReviewWorkspace({ type, id, onClose, onChanged }) {
  const [item, setItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [working, setWorking] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const itemResp = await api.inboxItem(type, id);
      setItem(itemResp?.data || null);
      const hist = await api.inboxHistory(type, id);
      setHistory(hist.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  const act = async (action, reasonVal) => {
    setWorking(action);
    setError("");
    try {
      if (action === "reject") {
        await api.reject(type, id, reasonVal);
      } else {
        await api[action](type, id);
      }
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking("");
      setRejecting(false);
      setReason("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-lg font-bold text-navy">
              {resourceConfigs[type]?.title || type} — Review
            </h2>
            {item && <StatusBadge status={item.status} />}
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {error && <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-600">{error}</div>}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-5 p-6">
              {/* Content */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Content</h3>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                  <h4 className="font-serif text-xl font-bold text-navy">{item?.title}</h4>
                  {item?.date && <p className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</p>}
                  {item?.category && <span className="mt-1 inline-block rounded bg-white px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200">{item.category}</span>}
                  <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{item?.content || item?.description}</p>
                  {item?.src || item?.image ? (
                    <img src={item.src || item.image} alt="" className="mt-3 h-44 w-full rounded-lg object-cover" />
                  ) : null}
                </div>
              </section>

              {/* Facebook source */}
              {item?.source === "facebook_import" && (
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <ExternalLink size={12} /> Facebook Source
                  </h3>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm">
                    <dl className="space-y-1.5">
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-500">Source</dt>
                        <dd className="font-medium text-indigo-700">Facebook Import</dd>
                      </div>
                      {item?.externalId && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray-500">External ID</dt>
                          <dd className="font-mono text-xs text-gray-700">{item.externalId}</dd>
                        </div>
                      )}
                      {item?.externalMetadata?.permalink && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray-500">Permalink</dt>
                          <dd>
                            <a href={item.externalMetadata.permalink} target="_blank" rel="noreferrer"
                               className="inline-flex items-center gap-1 font-medium text-navy hover:underline">
                              View on Facebook <ExternalLink size={11} />
                            </a>
                          </dd>
                        </div>
                      )}
                      {item?.externalMetadata?.originalMessage ? (
                        <div className="pt-1">
                          <dt className="text-gray-500">Original (unedited)</dt>
                          <dd className="mt-1 whitespace-pre-line text-xs text-gray-700">{item.externalMetadata.originalMessage}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </section>
              )}

              {/* AI Assist (suggestions only) */}
              <AIAssist type={type} id={id} onApplied={() => load()} />

              {/* Facebook Publishing (explicit human action, CMS-published only) */}
              <FacebookPublish type={type} id={id} item={item} onChanged={() => load()} />

              {/* Attachments */}
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <Paperclip size={12} /> Attachments
                </h3>
                {item?.attachments?.length ? (
                  <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                    {item.attachments.map((a, i) => (
                      <li key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <a href={a.url} target="_blank" rel="noreferrer" className="truncate font-medium text-navy hover:underline">
                          {a.name}
                        </a>
                        <span className="ml-auto shrink-0 text-xs text-gray-400">{a.format || "file"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">No attachments.</p>
                )}
              </section>

              {/* Metadata */}
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Submission</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500">Created by</dt><dd className="font-medium text-navy">{item?.createdBy || "System"}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Submitted at</dt><dd>{item?.submittedAt ? new Date(item.submittedAt).toLocaleString() : "—"}</dd></div>
                    {item?.rejectionReason && <div className="justify-between"><dt className="text-gray-500">Rejection reason</dt><dd className="text-red-600">{(item.rejectionReason)}</dd></div>}
                  </dl>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Reviewer</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500">Approved by</dt><dd>{item?.approvedBy ? "stamped" : "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Published by</dt><dd>{item?.publishedBy ? "stamped" : "—"}</dd></div>
                  </dl>
                </div>
              </section>

              {/* History */}
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <Clock size={12} /> History
                </h3>
                <ol className="space-y-2">
                  {history.length === 0 && <li className="text-sm text-gray-400">No history yet.</li>}
                  {history.map((h, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${h.action === "reject" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                        {ACTION_LABEL[h.action] || h.action}
                      </span>
                      <span className="truncate text-gray-600">{h.userName}</span>
                      <span className="ml-auto shrink-0 text-xs text-gray-400">
                        {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          {item?.status === "pending_review" && (
            <>
              {canRejectContent() && (
                <button
                  onClick={() => setRejecting(true)}
                  className="flex items-center gap-1.5 rounded-md bg-white px-4 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50"
                >
                  <MessageSquare size={14} /> Reject
                </button>
              )}
              {canApproveContent() && (
                <button
                  onClick={() => act("approve")}
                  disabled={working === "approve"}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check size={14} /> Approve
                </button>
              )}
            </>
          )}
          <button onClick={onClose} className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Close
          </button>
        </div>

        {rejecting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="font-serif text-lg font-bold text-navy">Reject item</h3>
              <p className="mt-1 text-sm text-gray-500">Reason is required. The author can revise and re-submit.</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Required reason..."
                autoFocus
                className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-400"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => { setRejecting(false); setReason(""); }} className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                <button
                  onClick={() => act("reject", reason.trim())}
                  disabled={working === "reject" || !reason.trim()}
                  className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {working === "reject" ? "Rejecting..." : "Reject item"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}