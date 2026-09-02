import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { api, canRestoreTrash, canDeleteTrash } from "./api";
import { resourceConfigs } from "./resourceConfigs";

function TrashSection({ resource, title, onLoaded }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .getTrash(resource)
      .then((data) => {
        const list = data.data || [];
        setItems(list);
        if (onLoaded) onLoaded(resource, list.length > 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // `load` is intentionally omitted: each <TrashSection> is remounted via
  // `key={config.resource}` in <Trash>, so re-running on every render is
  // unnecessary and would duplicate requests. Same convention as <EmptyState>.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const handleRestore = async (id) => {
    try {
      await api.restore(resource, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm("Permanently delete this item? This cannot be undone.")) return;
    try {
      await api.permanentDelete(resource, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-2 font-serif text-base font-bold text-navy">{title}</h2>
      {error && <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item._id}>
                <td className="px-5 py-3 text-navy">{item.title || item.name || item._id}</td>
                <td className="px-5 py-3 text-xs text-gray-400">
                  Deleted {new Date(item.deletedAt).toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {canRestoreTrash() && (
                      <button
                        onClick={() => handleRestore(item._id)}
                        className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-green-50 hover:text-green-700"
                      >
                        <RotateCcw size={13} /> Restore
                      </button>
                    )}
                    {canDeleteTrash() && (
                      <button
                        onClick={() => handlePermanentDelete(item._id)}
                        className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={13} /> Delete Permanently
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Trash() {
  const resources = Object.values(resourceConfigs);
  const [loaded, setLoaded] = useState({ count: 0, any: false });

  const handleLoaded = (resource, hasItems) => {
    setLoaded((prev) => {
      if (prev.any) return prev;
      const count = prev.count === resources.length ? prev.count : prev.count + 1;
      return { count, any: hasItems };
    });
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy">Trash</h1>
      <p className="mt-1 text-sm text-gray-500">
        Deleted items are kept here until permanently removed. Only administrators can permanently delete or empty the trash.
      </p>

      <div className="mt-6">
        {resources.map((config) => (
          <TrashSection key={config.resource} resource={config.resource} title={config.title} onLoaded={handleLoaded} />
        ))}
      </div>

      {loaded.count >= resources.length && !loaded.any && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Trash is empty.
        </div>
      )}
    </div>
  );
}

export default Trash;
