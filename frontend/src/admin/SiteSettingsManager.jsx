import { useEffect, useState } from "react";
import { api } from "./api";

const defaultValues = {
  schoolName: "Kaseni Model Secondary English School",
  shortName: "KMES",
  logoUrl: "",
  heroImage: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80",
  heroEyebrow: "Est. 2059 B.S.",
  heroTitle: "Kaseni Model Secondary English School",
  heroDescription:
    "Nurturing academic excellence, character, and confidence from Nursery to Grade 10 in a modern, English-medium learning environment.",
  footerDescription:
    "An academic institution committed to quality English-medium education from Nursery to Grade 10.",
  address: "Kaseni, Nepal",
  phone: "+977-XXXXXXXXXX",
  email: "info@kmes.edu.np",
  facebookUrl: "https://www.facebook.com/61554117025008",
  principalName: "Principal",
  principalTitle: "Principal",
  principalPhoto: "",
  principalMessage:
    "Our school is committed to building confident learners, responsible citizens, and compassionate leaders through quality education and character development.",
  directorName: "Director",
  directorTitle: "Director",
  directorPhoto: "",
  directorMessage:
    "We believe meaningful education blends academic excellence with discipline, creativity, and community spirit to prepare students for the future.",
};

const fields = [
  { name: "schoolName", label: "School Name", type: "text" },
  { name: "shortName", label: "Short Name / Brand", type: "text" },
  { name: "logoUrl", label: "Header Logo URL", type: "imageUpload" },
  { name: "heroImage", label: "Hero Background Image URL", type: "imageUpload" },
  { name: "heroEyebrow", label: "Hero Eyebrow", type: "text" },
  { name: "heroTitle", label: "Hero Title", type: "text" },
  { name: "heroDescription", label: "Hero Description", type: "textarea" },
  { name: "footerDescription", label: "Footer Description", type: "textarea" },
  { name: "address", label: "Address", type: "text" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "email", label: "Email", type: "text" },
  { name: "facebookUrl", label: "Facebook URL", type: "text" },
  { name: "principalName", label: "Principal Name", type: "text" },
  { name: "principalTitle", label: "Principal Title", type: "text" },
  { name: "principalPhoto", label: "Principal Photo URL", type: "imageUpload" },
  { name: "principalMessage", label: "Principal Message", type: "textarea" },
  { name: "directorName", label: "Director Name", type: "text" },
  { name: "directorTitle", label: "Director Title", type: "text" },
  { name: "directorPhoto", label: "Director Photo URL", type: "imageUpload" },
  { name: "directorMessage", label: "Director Message", type: "textarea" },
];

function SiteSettingsManager() {
  const [settings, setSettings] = useState(defaultValues);
  const [id, setId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api
      .getAll("site-settings")
      .then(async (data) => {
        const items = data.data || [];
        if (!items.length) {
          const created = await api.create("site-settings", defaultValues);
          setId(created.data?._id || null);
          setSettings({ ...defaultValues, ...(created.data || {}) });
          return;
        }

        const item = items[0];
        setId(item._id);
        setSettings({ ...defaultValues, ...item });
      })
      .catch((err) => {
        setError(err.message || "Unable to load site settings.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (fieldName, file) => {
    if (!file) return;
    try {
      setError("");
      const uploaded = await api.uploadImage(file);
      handleChange(fieldName, uploaded.url);
    } catch (err) {
      setError(err.message || "Image upload failed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!id) {
        const created = await api.create("site-settings", settings);
        setId(created.data?._id || null);
      } else {
        await api.update("site-settings", id, settings);
      }
      await load();
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = window.confirm("Delete all site settings and restore the default values?");
    if (!ok) return;

    try {
      await api.remove("site-settings", id);
      setId(null);
      setSettings(defaultValues);
    } catch (err) {
      setError(err.message || "Failed to delete settings.");
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading site settings...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Site Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Edit the brand, header, footer, and leadership content used on every public page.
          </p>
        </div>
        {id && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            Delete
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                {field.label}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  value={settings[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                />
              ) : field.type === "imageUpload" ? (
                <div className="space-y-2">
                  {settings[field.name] ? (
                    <img src={settings[field.name]} alt={field.label} className="h-20 w-20 rounded-lg object-cover shadow-sm" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400">
                      Image
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(field.name, e.target.files?.[0])}
                    className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                  />
                  <input
                    type="text"
                    value={settings[field.name] ?? ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder="Image URL"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={settings[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setSettings(defaultValues)}
            className="rounded-md px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            Reset to Default
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SiteSettingsManager;
