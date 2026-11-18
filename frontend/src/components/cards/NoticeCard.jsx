import { ArrowRight, Pin, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/format";

function parseDatePill(rawDate) {
  if (!rawDate) return { day: "—", month: "NOTICE" };
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) {
    return { day: "•", month: "NOTICE" };
  }
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return { day, month };
}

export default function NoticeCard({ notice }) {
  const { day, month } = parseDatePill(notice.date);

  return (
    <article className="deck-card group flex flex-col justify-between p-6 transition-all duration-300">
      <div>
        {/* Top Meta Bar */}
        <div className="flex items-start justify-between gap-3">
          {/* ClassDeck Calendar Date Block */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-center shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                {month}
              </span>
              <span className="text-lg font-black text-navy leading-none">
                {day}
              </span>
            </div>

            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <FileText size={12} className="text-slate-400" />
                {notice.category || "Official Circular"}
              </span>
              <p className="text-[11px] text-slate-400">
                {formatDate(notice.date) || notice.date}
              </p>
            </div>
          </div>

          {/* Pinned Pill */}
          {notice.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
              <Pin size={11} className="text-amber-600 fill-amber-600" />
              Pinned
            </span>
          )}
        </div>

        {/* Notice Title */}
        <h3 className="mt-4 text-base font-bold text-navy group-hover:text-gold transition line-clamp-2">
          {notice.title}
        </h3>

        {/* Notice Excerpt */}
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">
          {notice.description}
        </p>
      </div>

      {/* Card Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500">
          Administration Desk
        </span>
        <Link
          to={`/notices/${notice._id || notice.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-navy group-hover:text-gold transition"
        >
          Read Circular <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
