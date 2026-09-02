import { useEffect, useState } from "react";
import { Search, Trash2, Copy, Upload, Check } from "lucide-react";
import { api, canDeleteMedia, canUploadMedia } from "./api";

function formatBytes(bytes) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function MediaLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .getMedia({ q: query })
      .then((data) => setItems(data.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await api.uploadImage(file);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this image permanently? Pages currently using it will show a broken image.")) return;
    try {
      await api.deleteMedia(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const copyUrl = (item) => {
    navigator.clipboard.writeText(item.url).then(() => {
      setCopiedId(item._id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Media Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            All images uploaded across the site. Select from here when adding content, or upload new images.
          </p>
        </div>
        {canUploadMedia() && (
          <label className="flex cursor-pointer items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-2">
            <Upload size={15} /> {uploading ? "Uploading..." : "Upload Media"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
          </label>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="relative mt-5 max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by filename..."
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
        />
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            No images uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <div key={item._id} className="group overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="aspect-square w-full overflow-hidden bg-gray-100">
                  <img src={item.url} alt={item.filename} className="h-full w-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-semibold text-navy" title={item.filename}>
                    {item.filename || "untitled"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                    {formatBytes(item.bytes)}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => copyUrl(item)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-gray-100 px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-200"
                    >
                      {copiedId === item._id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === item._id ? "Copied" : "Copy URL"}
                    </button>
                    {canDeleteMedia() && (
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="rounded-md bg-gray-100 px-2 py-1.5 text-red-500 hover:bg-red-50"
                        aria-label="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaLibrary;
