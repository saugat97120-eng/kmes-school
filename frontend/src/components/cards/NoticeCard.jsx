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
            <div className="flex flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-center shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                {month}
              </span>
              <span className="text-lg font-black text-navy leading-none">
                {day}
              </span>
            </div>

            <div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                <FileText size={13} className="text-slate-500" />
                {notice.category || "Official Circular"}
              </span>
              <p className="text-xs font-medium text-slate-600">
                {formatDate(notice.date) || notice.date}
              </p>
            </div>
          </div>

          {/* Pinned Pill */}
          {notice.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              <Pin size={11} className="text-amber-700 fill-amber-700" />
              Pinned
            </span>
          )}
        </div>

        {/* Notice Title */}
        <h3 className="mt-4 text-base font-bold text-navy group-hover:text-amber-800 transition line-clamp-2">
          {notice.title}
        </h3>

        {/* Notice Excerpt */}
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-700 font-normal">
          {notice.description}
        </p>
      </div>

      {/* Card Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">
          Administration Desk
        </span>
        <Link
          to={`/notices/${notice._id || notice.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-navy group-hover:text-amber-800 transition"
        >
          Read Circular <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
