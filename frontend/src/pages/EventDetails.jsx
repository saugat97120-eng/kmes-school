import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Container from "../components/common/Container";
import EmptyState from "../components/common/EmptyState";
import { ArrowLeft, CalendarDays, Download, MapPin } from "lucide-react";
import { fetchEvent } from "../utils/apiHelpers";

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
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

function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEvent(id);
        setEvent(data || null);
      } catch (err) {
        setError(err.message);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadEvent();
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

  if (error || !event) {
    return (
      <section className="py-24">
        <Container className="max-w-2xl text-center">
          <EmptyState title="Event not found" description="This event may have been removed." />
          <Link to="/events" className="mt-6 inline-block text-sm font-semibold text-navy hover:text-gold">
            ← Back to Events
          </Link>
        </Container>
      </section>
    );
  }

  const attachments = Array.isArray(event.attachments) ? event.attachments : [];

  return (
    <section className="py-20">
      <Container className="max-w-3xl">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold">
          <ArrowLeft size={16} /> Back to Events
        </Link>

        <h1 className="mt-6 font-serif text-3xl font-bold text-navy sm:text-4xl">
          {event.title}
        </h1>

        <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-2"><CalendarDays size={16} /> {new Date(event.date).toLocaleDateString()}</span>
          {event.location && (
            <span className="flex items-center gap-2"><MapPin size={16} /> {event.location}</span>
          )}
        </div>

        {event.image && (
          <div className="mt-8 aspect-video overflow-hidden rounded-2xl bg-gray-100">
            <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
          </div>
        )}

        <p className="mt-8 leading-8 text-gray-600">{event.description}</p>

        {attachments.length > 0 && (
          <div className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-navy">
              <span>📎</span> Attachments
            </h2>
            <div className="mt-4 space-y-2">
              {attachments.map((att, idx) => (
                <a
                  key={att._id || idx}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-navy hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getFileIcon(att.format)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{att.name}</p>
                      {att.size && <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>}
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

export default EventDetails;
