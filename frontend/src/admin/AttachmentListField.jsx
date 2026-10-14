import { useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { api } from "./api";

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function getFileIcon(format) {
  const icons = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "🎯",
    pptx: "🎯",
    image: "🖼️",
    jpg: "🖼️",
    png: "🖼️",
    webp: "🖼️",
    gif: "🖼️",
  };
  return icons[format] || "📎";
}

export function AttachmentListField({ resource, itemId, attachments = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFileSelect = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    setUploadProgress(0);

    try {
      // Only proceed if item is saved (has ID)
      if (!itemId) {
        setError("Please save the item first before adding attachments");
        setUploading(false);
        return;
      }

      const attachment = await api.uploadAttachment(resource, itemId, file, setUploadProgress);

      // Update parent with new attachment
      onChange([...(attachments || []), attachment]);
      setUploadProgress(0);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      input.value = ""; // allow picking the same file again
      setUploading(false);
    }
  };

  const handleRemove = async (attachmentId) => {
    if (!window.confirm("Remove this attachment?")) return;

    try {
      setError("");
      await api.deleteAttachment(resource, itemId, attachmentId);
      onChange(attachments.filter((a) => a._id !== attachmentId));
    } catch (err) {
      setError(err.message || "Failed to remove attachment");
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-900">
          📎 Attachments
        </label>
        <span className="text-xs text-gray-500">Max 10MB per file</span>
      </div>

      {/* Upload button */}
      <div>
        <input
          type="file"
          id={`attachment-input-${resource}`}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif"
          disabled={uploading || !itemId}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => document.getElementById(`attachment-input-${resource}`).click()}
          disabled={uploading || !itemId}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Upload size={16} />
          {uploading ? "Uploading..." : "Upload File"}
        </button>
        {!itemId && (
          <p className="mt-2 text-xs text-gray-500">💡 Save the item first to add attachments</p>
        )}
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Uploading...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Attachments list */}
      {attachments && attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((att, idx) => (
            <div
              key={att._id || `${att.name || "attachment"}-${att.url || "unknown"}-${idx}`}
              className="flex items-center justify-between rounded-lg bg-white p-3 border border-gray-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">{getFileIcon(att.format)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{att.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(att.size || 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {att.url && (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(att._id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove attachment"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No attachments yet</p>
      )}
    </div>
  );
}
