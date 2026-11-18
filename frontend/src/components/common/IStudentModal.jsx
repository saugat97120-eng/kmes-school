import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  GraduationCap,
  BellRing,
  CalendarDays,
  FileText,
  Award,
  Layers,
  PhoneCall,
  ShieldCheck,
  Compass,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";

const studentPortals = [
  {
    title: "Admissions 2083",
    badge: "Open Now",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Online registration, entrance criteria, and prospectus for Nursery to Grade 10.",
    to: "/admissions",
    icon: FileText,
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Notice Board & Circulars",
    badge: "Real-time",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Official school announcements, exam routines, holiday notices, and circulars.",
    to: "/notices",
    icon: BellRing,
    iconBg: "bg-amber-50 text-amber-600",
  },
  {
    title: "Academic Curriculum",
    badge: "Nursery – 10",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description: "English-medium basic & secondary syllabus following national curriculum.",
    to: "/academics",
    icon: BookOpen,
    iconBg: "bg-blue-50 text-blue-600",
  },
  {
    title: "School Events & Calendar",
    badge: "Session 2081/82",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "Sports meet, cultural programs, parent-teacher meetings, and academic terms.",
    to: "/events",
    icon: CalendarDays,
    iconBg: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Campus Facilities",
    badge: "Modern Labs",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Science lab, computer facility, library, playground, and student transport.",
    to: "/facilities",
    icon: Layers,
    iconBg: "bg-purple-50 text-purple-600",
  },
  {
    title: "Hall of Fame & Results",
    badge: "100% SEE",
    badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-200",
    description: "Academic board toppers, sports accolades, and co-curricular achievements.",
    to: "/achievements",
    icon: Award,
    iconBg: "bg-yellow-50 text-yellow-600",
  },
  {
    title: "Campus Life & Gallery",
    badge: "Photo Deck",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    description: "Explore snapshots of daily classroom engagement and annual school milestones.",
    to: "/gallery",
    icon: Compass,
    iconBg: "bg-rose-50 text-rose-600",
  },
  {
    title: "Staff & Faculty Access",
    badge: "Portal Login",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    description: "Authorized teacher and administration access to manage announcements and records.",
    to: "/admin/login",
    icon: ShieldCheck,
    iconBg: "bg-slate-100 text-slate-700",
  },
];

export default function IStudentModal({ isOpen, onClose }) {
  const { settings } = useSiteSettings();

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const phone = settings.phone || "+977 9842089044";
  const rawPhone = phone.split(/[,/]/)[0].trim().replace(/[^0-9+]/g, "");

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-navy via-navy-2 to-navy px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/20 text-gold border border-gold/30">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg text-white">
                  iStudent & ClassDeck Hub
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  Live Portal
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {settings.schoolName || "Kaseni Model Secondary English School"} • {settings.address || "Kaseni, Nepal"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            aria-label="Close portal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body: Grid of Deck Cards */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Student & Academic Services
            </p>
            <span className="text-xs text-slate-400">
              Academic Session: <strong className="text-slate-700">{settings.academicSession || "2081/2082"}</strong>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {studentPortals.map((portal) => (
              <Link
                key={portal.title}
                to={portal.to}
                onClick={onClose}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:border-gold hover:bg-slate-50/60 hover:shadow-md cursor-pointer"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${portal.iconBg}`}
                >
                  <portal.icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-navy group-hover:text-gold transition text-sm">
                      {portal.title}
                    </h4>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${portal.badgeColor}`}
                    >
                      {portal.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600 line-clamp-2">
                    {portal.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Need direct assistance?</span>
            <a
              href={`tel:${rawPhone}`}
              className="inline-flex items-center gap-1 font-semibold text-navy hover:text-gold"
            >
              <PhoneCall size={14} className="text-gold" />
              {phone}
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admissions"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-2 transition cursor-pointer"
            >
              Apply Online <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
