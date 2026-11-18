import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { formatDate, IMAGE_FALLBACK, handleImageError } from "../../utils/format";

function parseDatePill(rawDate) {
  if (!rawDate) return { day: "—", month: "EVENT" };
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) {
    return { day: "•", month: "EVENT" };
  }
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return { day, month };
}

export default function EventCard({ event }) {
  const { day, month } = parseDatePill(event.date);

  return (
    <article className="deck-card group flex flex-col justify-between overflow-hidden transition-all duration-300">
      <div>
        {/* Cover Image with Date Badge Overlay */}
        <div className="relative aspect-video overflow-hidden bg-slate-100">
          <img
            src={event.image || IMAGE_FALLBACK}
            alt={event.title}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Floating Date Badge */}
          <div className="absolute top-3 left-3 flex flex-col items-center justify-center rounded-xl bg-white/95 backdrop-blur-md px-3 py-1.5 text-center shadow-md border border-white/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              {month}
            </span>
            <span className="text-base font-black text-navy leading-none">
              {day}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <MapPin size={13} className="text-gold" />
            <span>{event.location || "KMES Main Campus, Belbari-05"}</span>
          </div>

          <h3 className="mt-2.5 text-base font-bold text-navy group-hover:text-gold transition line-clamp-2">
            {event.title}
          </h3>

          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">
            {event.description}
          </p>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-5 pt-0">
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">
            {formatDate(event.date) || event.date}
          </span>
          <Link
            to={`/events/${event._id || event.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-navy group-hover:text-gold transition"
          >
            View Event <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}
