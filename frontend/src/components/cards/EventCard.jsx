import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import { formatDate, IMAGE_FALLBACK, handleImageError } from "../../utils/format";

function EventCard({ event }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="aspect-video overflow-hidden bg-gray-100">
        <img
          src={event.image || IMAGE_FALLBACK}
          alt={event.title}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
          className="h-full w-full object-cover transition duration-500 hover:scale-105"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CalendarDays size={16} />
          {formatDate(event.date) || event.date}
        </div>
        <h3 className="mt-3 font-serif text-xl font-bold text-navy">{event.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
          {event.description}
        </p>
        <Link
          to={`/events/${event._id || event.id}`}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold"
        >
          View Event <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

export default EventCard;
