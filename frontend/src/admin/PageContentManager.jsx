import { useEffect, useState } from "react";
import { api } from "./api";

const pageDefaults = {
  slug: "about",
  title: "Kaseni Model Secondary English School",
  eyebrow: "About Us",
  description: "Learn about our school, history, leadership, mission, and vision.",
  heroImage: "",
  history: "Kaseni Model English School was established in 2059 B.S. according to the school's official seal.",
  mission:
    "To provide quality, values-based education that prepares every student for lifelong learning and responsible citizenship.",
  vision:
    "To be a leading institution recognized for academic excellence, character development, and community contribution.",
  principalMessage:
    "To be published once confirmed by the school administration.",
  directorMessage:
    "To be published once confirmed by the school administration.",
  admissionsIntro:
    "For current admission availability and information, please contact our school.",
  admissionsCtaText: "Contact for Admission",
  admissionsCtaLink: "/contact",
  published: true,
};

const fields = [
  { name: "slug", label: "Page Slug", type: "text" },
  { name: "eyebrow", label: "Eyebrow", type: "text" },
  { name: "title", label: "Page Title", type: "text" },
  { name: "description", label: "Page Description", type: "textarea" },
  { name: "heroImage", label: "Hero Image URL", type: "imageUpload" },
  { name: "history", label: "History / Intro", type: "textarea" },
  { name: "mission", label: "Mission", type: "textarea" },
  { name: "vision", label: "Vision", type: "textarea" },
  { name: "principalMessage", label: "Principal Message", type: "textarea" },
  { name: "directorMessage", label: "Director Message", type: "textarea" },
  { name: "admissionsIntro", label: "Admissions Intro", type: "textarea" },
  { name: "admissionsCtaText", label: "Admission CTA Text", type: "text" },
  { name: "admissionsCtaLink", label: "Admission CTA Link", type: "text" },
  { name: "published", label: "Published", type: "checkbox" },
];

function PageContentManager() {
  const [pages, setPages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(pageDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getAll("page-content");
      const items = data.data || [];
      setPages(items);
      if (items.length) {
        const first = items[0];
        setSelectedId(first._id);
        setForm({ ...pageDefaults, ...first });
      } else {
        setSelectedId(null);
        setForm(pageDefaults);
      }
    } catch (err) {
      setError(err.message || "Unable to load page content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
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

  const handleSelect = (page) => {
    setSelectedId(page._id);
    setForm({ ...pageDefaults, ...page });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (selectedId) {
        await api.update("page-content", selectedId, form);
      } else {
        const created = await api.create("page-content", form);
        setSelectedId(created.data?._id || null);
      }
      await load();
    } catch (err) {
      setError(err.message || "Could not save page content.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setForm({ ...pageDefaults, slug: "new-page" });
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading website pages...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Website Pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage editable content for the public pages across the website.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateNew}
          className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-2"
        >
          New Page
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="space-y-2">
            {pages.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">No pages yet</p>
            ) : (
              pages.map((page) => (
                <button
                  key={page._id}
                  type="button"
                  onClick={() => handleSelect(page)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    selectedId === page._id
                      ? "bg-navy text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {page.slug}
                </button>
              ))
            )}
          </div>
        </aside>

        <form onSubmit={handleSave} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {field.label}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    value={form[field.name] ?? ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(form[field.name])}
                      onChange={(e) => handleChange(field.name, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Published
                  </label>
                ) : field.type === "imageUpload" ? (
                  <div className="space-y-2">
                    {form[field.name] ? (
                      <img src={form[field.name]} alt={field.label} className="h-20 w-20 rounded-lg object-cover shadow-sm" />
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
                      value={form[field.name] ?? ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder="Image URL"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={form[field.name] ?? ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setForm(pageDefaults)}
              className="rounded-md px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Page"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PageContentManager;
