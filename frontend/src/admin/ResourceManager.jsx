import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Pin, Search, CheckSquare, Square, Eye } from "lucide-react";
import { api, canDeleteContent, canSubmitContent, canApproveContent, canRejectContent, canPublishContent, canUnpublishContent, canUploadMedia } from "./api";
import { AttachmentListField } from "./AttachmentListField";
import StatusBadge from "./StatusBadge";

function emptyForm(fields) {
  const obj = {};
  fields.forEach((f) => {
    if (f.type === "checkbox") obj[f.name] = f.default ?? false;
    else if (f.type === "attachmentList") obj[f.name] = [];
    else obj[f.name] = "";
  });
  return obj;
}

function ResourceManager({ config }) {
  const { title, resource, fields, columns } = config;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm(fields));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingStatus, setEditingStatus] = useState("");
  const mounted = useRef(false);

  // search / filter / pagination
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // bulk selection
  const [selected, setSelected] = useState([]);

  // Phase 7 workflow UI state
  const [rejecting, setRejecting] = useState(null); // { resource, id, title }
  const [rejectReason, setRejectReason] = useState("");
  const [confirming, setConfirming] = useState(null); // { label, action } -> void
  const [working, setWorking] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAll(resource, { q: query, status, page, limit: 20 });
      setItems(data.data || []);
      setPages(data.pages || 1);
      setTotal(data.total ?? data.data?.length ?? 0);
      setSelected([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, page]);

  // debounce search/filter changes back to page 1 + reload
  useEffect(() => {
    // The first effect already loads on mount; only react to later search/filter edits.
    if (!mounted.current) {
      mounted.current = true;
      return undefined;
    }
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status]);

  const openCreate = () => {
    setEditingId(null);
    setEditingStatus("");
    setForm(emptyForm(fields));
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setEditingStatus(item.status || "");
    const next = emptyForm(fields);
    fields.forEach((f) => {
      let val = item[f.name];
      if (f.type === "date" && val) {
        const parsed = new Date(val);
        val = Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
      }
      next[f.name] = val ?? next[f.name];
    });
    setForm(next);
    setFormOpen(true);
  };

  const openPreview = (item) => {
    setForm(item);
    setPreviewOpen(true);
  };

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field.name]: value }));
  };

  const handleImageUpload = async (field, file) => {
    if (!file) return;
    try {
      setError("");
      setUploading(true);
      const uploaded = await api.uploadImage(file);
      handleChange(field, uploaded.url);
    } catch (err) {
      setError(err.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    setSaving(true);
    setError("");
    try {
      // Empty optional dates are omitted so the server keeps its default
      // instead of storing an empty value that later renders as 1 Jan 1970.
      const payload = { ...form };
      fields.forEach((fld) => {
        if (fld.type === "date" && !payload[fld.name]) delete payload[fld.name];
      });
      if (editingId) {
        await api.update(resource, editingId, payload);
      } else {
        await api.create(resource, payload);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Move this item to trash? An admin can restore or permanently delete it later.")) return;
    try {
      await api.remove(resource, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const toggleSelectAll = () => {
    setSelected((s) => (s.length === items.length ? [] : items.map((i) => i._id)));
  };

  const handleBulkTrash = async () => {
    if (!selected.length) return;
    if (!confirm(`Move ${selected.length} item(s) to trash?`)) return;
    try {
      await api.bulkTrash(resource, selected);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkPublish = async (published) => {
    if (!selected.length) return;
    try {
      setNotice("");
      const res = await api.bulkPublish(resource, selected, published);
      const r = res?.results || {};
      const done = (r.published?.length || 0) + (r.unpublished?.length || 0);
      const skipped = (r.invalidState?.length || 0) + (r.skipped?.length || 0) + (r.unauthorized?.length || 0) + (r.failed?.length || 0);
      setNotice(
        skipped
          ? `${done} item(s) updated, ${skipped} skipped (wrong workflow state or no permission).`
          : `${done} item(s) ${published ? "published" : "unpublished"}.`
      );
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const runWorkflow = async (action, item) => {
    setWorking(item._id);
    setError("");
    try {
      await api[action](resource, item._id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking("");
    }
  };

  const openReject = (item) => {
    setRejecting(item);
    setRejectReason("");
  };

  const confirmAction = (label, action) => {
    setConfirming({ label, action });
  };

  const submitReject = async () => {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setWorking("reject");
    setError("");
    try {
      await api.reject(resource, rejecting._id, rejectReason.trim());
      setRejecting(null);
      setRejectReason("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking("");
    }
  };

  const runConfirmedAction = async () => {
    if (!confirming) return;
    setWorking("confirm");
    try {
      await confirming.action();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(null);
      setWorking("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-navy">{title}</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-2"
        >
          <Plus size={16} /> New
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {notice && !error && (
        <div className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-700" role="status">{notice}</div>
      )}

      {/* Search + filter toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-navy/5 px-3 py-2 text-xs font-semibold text-navy">
            {selected.length} selected
            {canPublishContent() && (
              <button onClick={() => handleBulkPublish(true)} className="rounded bg-white px-2 py-1 hover:bg-green-50 hover:text-green-700">
                Publish
              </button>
            )}
            {canUnpublishContent() && (
              <button onClick={() => handleBulkPublish(false)} className="rounded bg-white px-2 py-1 hover:bg-gray-100">
                Unpublish
              </button>
            )}
            {canDeleteContent() && (
              <button onClick={handleBulkTrash} className="rounded bg-white px-2 py-1 hover:bg-red-50 hover:text-red-600">
                Trash
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            {query || status ? "No items match your search." : 'No items yet. Click "New" to add the first one.'}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  <button onClick={toggleSelectAll} aria-label="Select all">
                    {selected.length === items.length ? (
                      <CheckSquare size={16} className="text-navy" />
                    ) : (
                      <Square size={16} className="text-gray-300" />
                    )}
                  </button>
                </th>
                {columns.map((col) => (
                  <th key={col} className="px-5 py-3 font-semibold">{col}</th>
                ))}
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item._id} className={selected.includes(item._id) ? "bg-navy/5" : ""}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(item._id)} aria-label="Select row">
                      {selected.includes(item._id) ? (
                        <CheckSquare size={16} className="text-navy" />
                      ) : (
                        <Square size={16} className="text-gray-300" />
                      )}
                    </button>
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="px-5 py-3 text-navy">
                      {col === "status" ? (
                        <StatusBadge status={item.status} />
                      ) : col === "pinned" ? (
                        item.pinned ? <Pin size={15} className="text-gold" /> : "—"
                      ) : col === "date" ? (
                        item.date ? new Date(item.date).toLocaleDateString() : "—"
                      ) : (
                        String(item[col] ?? "—").slice(0, 60)
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {canSubmitContent() && item.status === "draft" && (
                        <button
                          onClick={() => runWorkflow("submit", item)}
                          disabled={working === item._id}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                          title="Submit for review"
                        >
                          Submit
                        </button>
                      )}
                      {canApproveContent() && item.status === "pending_review" && (
                        <button
                          onClick={() => runWorkflow("approve", item)}
                          disabled={working === item._id}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          title="Approve"
                        >
                          Approve
                        </button>
                      )}
                      {canRejectContent() && item.status === "pending_review" && (
                        <button
                          onClick={() => openReject(item)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          title="Reject"
                        >
                          Reject
                        </button>
                      )}
                      {canPublishContent() && item.status === "approved" && (
                        <button
                          onClick={() => confirmAction(`Publish “${item[columns[0]] ?? item._id}”?`, () => runWorkflow("publish", item))}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                          title="Publish"
                        >
                          Publish
                        </button>
                      )}
                      {canUnpublishContent() && item.status === "published" && (
                        <button
                          onClick={() => confirmAction(`Unpublish “${item[columns[0]] ?? item._id}”? It will return to draft.`, () => runWorkflow("unpublish", item))}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                          title="Unpublish"
                        >
                          Unpublish
                        </button>
                      )}
                      <button
                        onClick={() => openPreview(item)}
                        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-navy"
                        aria-label="Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-navy"
                        aria-label="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      {canDeleteContent() && (
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="Move to trash"
                          title="Move to trash"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-navy">
                {editingId ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}
              </h2>
              <button onClick={() => setFormOpen(false)} aria-label="Close">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {editingId && editingStatus && editingStatus !== "draft" && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  This item is currently <strong>{editingStatus.replace("_", " ")}</strong>. Saving changes sends it back to
                  draft so it can be reviewed again before going live.
                </p>
              )}
              {fields.map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={`resource-${field.name}`}
                    className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500"
                  >
                    {field.label}
                  </label>

                  {field.type === "textarea" && (
                    <textarea
                      id={`resource-${field.name}`}
                      name={field.name}
                      required={field.required}
                      rows={4}
                      value={form[field.name]}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  )}

                  {field.type === "text" && (
                    <input
                      id={`resource-${field.name}`}
                      name={field.name}
                      required={field.required}
                      type="text"
                      value={form[field.name]}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  )}

                  {field.type === "imageUpload" && (
                    <div className="space-y-2">
                      {form[field.name] ? (
                        <img src={form[field.name]} alt={field.label} className="h-20 w-20 rounded-lg object-cover shadow-sm" />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400">
                          Image
                        </div>
                      )}
                      {canUploadMedia() ? (
                        <input
                          id={`resource-${field.name}-file`}
                          name={`${field.name}-file`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            handleImageUpload(field, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                        />
                      ) : (
                        <p className="text-xs text-gray-400">
                          You do not have permission to upload new images. Paste an existing image URL below, or ask an admin to upload one to the Media Library.
                        </p>
                      )}
                      {uploading && <p className="text-xs text-gray-500">Uploading image...</p>}
                      <input
                        id={`resource-${field.name}`}
                        name={field.name}
                        type="text"
                        required={field.required}
                        value={form[field.name] || ""}
                        onChange={(e) => handleChange(field, e.target.value)}
                        placeholder="Image URL"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                      />
                    </div>
                  )}

                  {field.type === "date" && (
                    <input
                      id={`resource-${field.name}`}
                      name={field.name}
                      required={field.required}
                      type="date"
                      value={form[field.name]}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  )}

                  {field.type === "select" && (
                    <select
                      id={`resource-${field.name}`}
                      name={field.name}
                      value={form[field.name]}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                    >
                      <option value="">Select...</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.type === "checkbox" && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        id={`resource-${field.name}`}
                        name={field.name}
                        type="checkbox"
                        checked={Boolean(form[field.name])}
                        onChange={(e) => handleChange(field, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Yes
                    </label>
                  )}

                  {field.type === "attachmentList" && (
                    <AttachmentListField
                      resource={resource}
                      itemId={editingId}
                      attachments={form[field.name]}
                      onChange={(attachments) => handleChange(field, attachments)}
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-md px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
                >
                  {saving ? "Saving..." : uploading ? "Uploading..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-navy">Preview</h2>
              <button onClick={() => setPreviewOpen(false)} aria-label="Close">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">This is how it will appear on the public site.</p>
            <div className="mt-5 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-5">
              {(form.image || form.src || form.heroImage) && (
                <img
                  src={form.image || form.src || form.heroImage}
                  alt=""
                  className="h-40 w-full rounded-lg object-cover"
                />
              )}
              <h3 className="font-serif text-xl font-bold text-navy">{form.title}</h3>
              {form.date && (
                <p className="text-xs text-gray-500">{new Date(form.date).toLocaleDateString()}</p>
              )}
              <p className="whitespace-pre-line text-sm text-gray-700">
                {form.content || form.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rejection reason modal */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-navy">Reject item</h2>
              <button onClick={() => setRejecting(null)} aria-label="Close">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Provide a reason for rejecting <span className="font-semibold text-navy">{rejecting[columns[0]] || "this item"}</span>.
              The author can then revise and re-submit.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Required reason..."
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-400"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="rounded-md px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={working === "reject"}
                className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {working === "reject" ? "Rejecting..." : "Reject item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal (publish / unpublish) */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-serif text-lg font-bold text-navy">Please confirm</h2>
            <p className="mt-2 text-sm text-gray-600">{confirming.label}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-md px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runConfirmedAction}
                disabled={working === "confirm"}
                className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
              >
                {working === "confirm" ? "Working..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourceManager;
