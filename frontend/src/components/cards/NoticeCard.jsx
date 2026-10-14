import { CalendarDays, ArrowRight, Pin } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/format";

function NoticeCard({ notice }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-gold">
          <CalendarDays size={20} />
        </div>
        {notice.pinned && <Pin size={18} className="text-gold" />}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {formatDate(notice.date) || notice.date}
      </p>
      <h3 className="mt-2 font-serif text-xl font-bold text-navy">{notice.title}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
        {notice.description}
      </p>
      <Link
        to={`/notices/${notice._id || notice.id}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold"
      >
        Read More <ArrowRight size={16} />
      </Link>
    </article>
  );
}

export default NoticeCard;
