import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Container from "../components/common/Container";
import EmptyState from "../components/common/EmptyState";
import { ArrowLeft, CalendarDays, Download } from "lucide-react";
import { fetchNotice } from "../utils/apiHelpers";

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

function NoticeDetails() {
  const { id } = useParams();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadNotice() {
      try {
        setLoading(true);
        setError(null);
        const found = await fetchNotice(id);
        if (!found) {
          setError("Notice not found");
          setNotice(null);
        } else {
          setNotice(found);
        }
      } catch (err) {
        setError(err.message);
        setNotice(null);
      } finally {
        setLoading(false);
      }
    }
    loadNotice();
  }, [id]);

  if (loading) {
    return (
      <section className="py-24">
        <Container className="max-w-2xl text-center">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-navy"></div>
          </div>
        </Container>
      </section>
    );
  }

  if (error || !notice) {
    return (
      <section className="py-24">
        <Container className="max-w-2xl text-center">
          <EmptyState title="Notice not found" description="This notice may have been removed." />
          <Link to="/notices" className="mt-6 inline-block text-sm font-semibold text-navy hover:text-gold">
            ← Back to Notices
          </Link>
        </Container>
      </section>
    );
  }

  // Support both new attachments array and legacy attachmentUrl
  const allAttachments = [
    ...(notice.attachments || []),
    ...(notice.attachmentUrl
      ? [{ url: notice.attachmentUrl, name: "Download", format: "legacy" }]
      : []),
  ];

  return (
    <section className="py-20">
      <Container className="max-w-3xl">
        <Link to="/notices" className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold">
          <ArrowLeft size={16} /> Back to Notices
        </Link>

        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
          <CalendarDays size={16} /> Published: {new Date(notice.date).toLocaleDateString()}
        </div>

        <h1 className="mt-3 font-serif text-3xl font-bold text-navy sm:text-4xl">
          {notice.title}
        </h1>

        <p className="mt-6 leading-8 text-gray-600">{notice.content || notice.description}</p>

        {/* Attachments section */}
        {allAttachments.length > 0 && (
          <div className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-navy">
              <span>📎</span> Attachments
            </h2>
            <div className="mt-4 space-y-2">
              {allAttachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-navy hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getFileIcon(att.format)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{att.name}</p>
                      {att.size && (
                        <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
                      )}
                    </div>
                  </div>
                  <Download size={18} className="text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

export default NoticeDetails;
