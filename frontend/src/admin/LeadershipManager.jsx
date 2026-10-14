import { useEffect, useState, useRef } from "react";
import {
  Upload,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { api, canUploadMedia } from "./api";
import { useSiteSettings } from "../context/useSiteSettings";

const DEFAULT_LEADERSHIP = {
  principal: {
    name: "Principal",
    designation: "Principal",
    message:
      "Our school is committed to building confident learners, responsible citizens, and compassionate leaders through quality education and character development.",
    photoUrl: "",
  },
  director: {
    name: "Director",
    designation: "Director",
    message:
      "We believe meaningful education blends academic excellence with discipline, creativity, and community spirit to prepare students for the future.",
    photoUrl: "",
  },
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function LeadershipProfileCard({
  roleKey,
  roleTitle,
  profile,
  onChange,
  onUploadPhoto,
  onRemovePhoto,
  uploading,
}) {
  const fileInputRef = useRef(null);

  const initial = (profile.name?.trim()?.slice(0, 1) || roleTitle.slice(0, 1)).toUpperCase();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhoto(roleKey, file);
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-navy">{roleTitle} Profile</h2>
          <p className="text-xs text-gray-500">Manage photograph, designation, and message</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-semibold text-navy">
          {roleTitle}
        </span>
      </div>

      {/* Photo Management Section */}
      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.name}
              className="h-28 w-28 rounded-full border-2 border-gold/40 object-cover shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`h-28 w-28 items-center justify-center rounded-full bg-navy border-2 border-gold/40 text-3xl font-bold text-gold shadow-md ${
              profile.photoUrl ? "hidden" : "flex"
            }`}
          >
            {initial}
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <label
            htmlFor={`leadership-${roleKey}-file`}
            className="text-xs font-bold uppercase tracking-wider text-gray-500"
          >
            Profile Photograph
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Recommended: Square photo (JPEG, PNG, WEBP), max 5 MB.
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <input
              id={`leadership-${roleKey}-file`}
              name={`leadership-${roleKey}-file`}
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />

            {canUploadMedia() && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-2 disabled:opacity-50"
              >
                <Upload size={14} className={uploading ? "animate-spin" : ""} />
                {uploading ? "Uploading..." : profile.photoUrl ? "Replace Photo" : "Upload Photo"}
              </button>
            )}

            {profile.photoUrl && (
              <button
                type="button"
                onClick={() => onRemovePhoto(roleKey)}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 size={14} /> Remove Photo
              </button>
            )}
          </div>

          <div className="mt-3">
            <label
              htmlFor={`leadership-${roleKey}-photo-url`}
              className="text-[11px] text-gray-400"
            >
              Direct Photo URL (optional)
            </label>
            <input
              id={`leadership-${roleKey}-photo-url`}
              name={`leadership-${roleKey}-photo-url`}
              type="url"
              value={profile.photoUrl || ""}
              onChange={(e) => onChange(roleKey, "photoUrl", e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-navy"
            />
          </div>
        </div>
      </div>

      {/* Profile Details Form */}
      <div className="mt-6 space-y-4">
        <div>
          <label
            htmlFor={`leadership-${roleKey}-name`}
            className="block text-xs font-bold uppercase tracking-wider text-navy"
          >
            Full Name
          </label>
          <input
            id={`leadership-${roleKey}-name`}
            name={`leadership-${roleKey}-name`}
            type="text"
            required
            value={profile.name}
            onChange={(e) => onChange(roleKey, "name", e.target.value)}
            placeholder={`Enter ${roleTitle}'s full name`}
            className="mt-1 w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-navy"
          />
        </div>

        <div>
          <label
            htmlFor={`leadership-${roleKey}-designation`}
            className="block text-xs font-bold uppercase tracking-wider text-navy"
          >
            Designation / Title
          </label>
          <input
            id={`leadership-${roleKey}-designation`}
            name={`leadership-${roleKey}-designation`}
            type="text"
            required
            value={profile.designation}
            onChange={(e) => onChange(roleKey, "designation", e.target.value)}
            placeholder="e.g. Principal or Founder Director"
            className="mt-1 w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-navy"
          />
        </div>

        <div>
          <label
            htmlFor={`leadership-${roleKey}-message`}
            className="block text-xs font-bold uppercase tracking-wider text-navy"
          >
            Message / Statement
          </label>
          <textarea
            id={`leadership-${roleKey}-message`}
            name={`leadership-${roleKey}-message`}
            rows={5}
            required
            value={profile.message}
            onChange={(e) => onChange(roleKey, "message", e.target.value)}
            placeholder={`Official message from the ${roleTitle} displayed on the website`}
            className="mt-1 w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm leading-relaxed text-gray-800 outline-none focus:border-navy"
          />
        </div>
      </div>
    </div>
  );
}

function LeadershipManager() {
  const { refresh: refreshGlobalSettings } = useSiteSettings();
  const [leadership, setLeadership] = useState(DEFAULT_LEADERSHIP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ principal: false, director: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = () => {
    api
      .getLeadership()
      .then((res) => {
        if (res?.success && res.data) {
          setLeadership({
            principal: {
              ...DEFAULT_LEADERSHIP.principal,
              ...(res.data.principal || {}),
            },
            director: {
              ...DEFAULT_LEADERSHIP.director,
              ...(res.data.director || {}),
            },
          });
        }
      })
      .catch((err) => {
        // Fallback to site settings if leadership endpoint not yet deployed
        return api
          .getAll("site-settings")
          .then((fallbackRes) => {
            const item = fallbackRes?.data?.[0];
            if (item) {
              setLeadership({
                principal: {
                  name: item.principalName || DEFAULT_LEADERSHIP.principal.name,
                  designation: item.principalTitle || DEFAULT_LEADERSHIP.principal.designation,
                  message: item.principalMessage || DEFAULT_LEADERSHIP.principal.message,
                  photoUrl: item.principalPhoto || "",
                },
                director: {
                  name: item.directorName || DEFAULT_LEADERSHIP.director.name,
                  designation: item.directorTitle || DEFAULT_LEADERSHIP.director.designation,
                  message: item.directorMessage || DEFAULT_LEADERSHIP.director.message,
                  photoUrl: item.directorPhoto || "",
                },
              });
            }
          })
          .catch(() => {
            setError(err.message || "Failed to load leadership profiles.");
          });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (roleKey, field, value) => {
    setLeadership((prev) => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        [field]: value,
      },
    }));
  };

  const handleUploadPhoto = async (roleKey, file) => {
    setError("");
    setSuccess("");

    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, WEBP, GIF).");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image file is too large. Maximum allowed size is 5 MB.");
      return;
    }

    setUploading((prev) => ({ ...prev, [roleKey]: true }));

    try {
      const uploaded = await api.uploadImage(file);
      if (uploaded?.url) {
        handleChange(roleKey, "photoUrl", uploaded.url);
        setSuccess(`Photo for ${roleKey === "principal" ? "Principal" : "Director"} uploaded successfully.`);
      } else {
        throw new Error("Upload did not return an image URL.");
      }
    } catch (err) {
      setError(
        err.message ||
          "Image upload failed. If Cloudinary is not configured, you can paste a direct photo URL instead."
      );
    } finally {
      setUploading((prev) => ({ ...prev, [roleKey]: false }));
    }
  };

  const handleRemovePhoto = (roleKey) => {
    handleChange(roleKey, "photoUrl", "");
    setSuccess(`Removed photograph for ${roleKey === "principal" ? "Principal" : "Director"}. Initials will be displayed as fallback.`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.updateLeadership(leadership);

      // Trigger global site settings refresh so public pages immediately update
      if (typeof refreshGlobalSettings === "function") {
        await refreshGlobalSettings();
      }

      setSuccess("Leadership profiles updated successfully! Changes are live on the website.");
    } catch (err) {
      setError(err.message || "Failed to save leadership changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <RefreshCw size={20} className="animate-spin mr-2 text-navy" />
        Loading leadership profiles...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Leadership Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage profile photographs, designations, and public messages for the Principal and Director.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-navy-2 disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? "Saving Changes..." : "Save Leadership"}
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 shadow-sm">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
          <div className="flex-1">{success}</div>
        </div>
      )}

      {/* Two Column Layout for Principal and Director */}
      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-2">
        <LeadershipProfileCard
          roleKey="principal"
          roleTitle="Principal"
          profile={leadership.principal}
          onChange={handleChange}
          onUploadPhoto={handleUploadPhoto}
          onRemovePhoto={handleRemovePhoto}
          uploading={uploading.principal}
        />

        <LeadershipProfileCard
          roleKey="director"
          roleTitle="Director"
          profile={leadership.director}
          onChange={handleChange}
          onUploadPhoto={handleUploadPhoto}
          onRemovePhoto={handleRemovePhoto}
          uploading={uploading.director}
        />
      </form>

      {/* Live Website Preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-gold" />
            <h2 className="font-serif text-lg font-bold text-navy">
              Live Website Preview (Public Homepage)
            </h2>
          </div>
          <span className="text-xs text-gray-400">Shows exact appearance on the homepage</span>
        </div>

        <div className="mt-6 rounded-2xl bg-bg-light p-6">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Principal Preview Card */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-4">
                {leadership.principal.photoUrl ? (
                  <img
                    src={leadership.principal.photoUrl}
                    alt={leadership.principal.name}
                    className="h-20 w-20 rounded-full border-2 border-gold/40 object-cover shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`h-20 w-20 items-center justify-center rounded-full bg-navy border-2 border-gold/40 text-xl font-bold text-gold shadow-sm ${
                    leadership.principal.photoUrl ? "hidden" : "flex"
                  }`}
                >
                  {(leadership.principal.name?.trim()?.slice(0, 1) || "P").toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-navy">
                    {leadership.principal.name || "Principal"}
                  </h3>
                  <p className="text-sm font-medium text-gray-500">
                    {leadership.principal.designation || "Principal"}
                  </p>
                </div>
              </div>
              <p className="leading-7 text-gray-700">
                {leadership.principal.message || "Message from the Principal."}
              </p>
            </div>

            {/* Director Preview Card */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-4">
                {leadership.director.photoUrl ? (
                  <img
                    src={leadership.director.photoUrl}
                    alt={leadership.director.name}
                    className="h-20 w-20 rounded-full border-2 border-gold/40 object-cover shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`h-20 w-20 items-center justify-center rounded-full bg-navy border-2 border-gold/40 text-xl font-bold text-gold shadow-sm ${
                    leadership.director.photoUrl ? "hidden" : "flex"
                  }`}
                >
                  {(leadership.director.name?.trim()?.slice(0, 1) || "D").toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-navy">
                    {leadership.director.name || "Director"}
                  </h3>
                  <p className="text-sm font-medium text-gray-500">
                    {leadership.director.designation || "Director"}
                  </p>
                </div>
              </div>
              <p className="leading-7 text-gray-700">
                {leadership.director.message || "Message from the Director."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeadershipManager;
