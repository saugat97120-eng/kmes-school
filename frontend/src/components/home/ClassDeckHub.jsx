import { useState } from "react";
import { Link } from "react-router-dom";
import Container from "../common/Container";
import {
  GraduationCap,
  BellRing,
  CalendarDays,
  FileCheck2,
  Trophy,
  Microscope,
  Image as ImageIcon,
  Headphones,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";
import useApiList from "../../hooks/useApiList";
import { fetchNotices } from "../../utils/apiHelpers";
import { formatDate } from "../../utils/format";

const loadNotices = () => fetchNotices();

export default function ClassDeckHub({ onOpenPortal }) {
  const { settings } = useSiteSettings();
  const { items: noticeItems } = useApiList(loadNotices);
  const [activeFilter, setActiveFilter] = useState("all");

  const latestNotice = noticeItems && noticeItems.length > 0 ? noticeItems[0] : null;

  const deckCards = [
    {
      id: "admissions",
      category: "academic",
      title: "Online Admissions 2083",
      tag: "Enrolling Now",
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      description: "Secure your child's seat for Nursery to Grade 10 with verified English-medium curricula.",
      to: "/admissions",
      icon: FileCheck2,
      iconColor: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
      highlight: "Direct Submission",
    },
    {
      id: "notices",
      category: "notice",
      title: "Notice Board & Circulars",
      tag: "Live Feed",
      tagColor: "bg-amber-50 text-amber-700 border-amber-200",
      description: "Official administrative announcements, exam schedules, and holiday notifications.",
      to: "/notices",
      icon: BellRing,
      iconColor: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
      highlight: "Updated Daily",
    },
    {
      id: "curriculum",
      category: "academic",
      title: "Academic Programs",
      tag: "Grade Nursery – 10",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
      description: "Comprehensive English medium syllabus aligned with Nepal National Examination Board guidelines.",
      to: "/academics",
      icon: GraduationCap,
      iconColor: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      highlight: "SEE Preparation",
    },
    {
      id: "calendar",
      category: "academic",
      title: "School Events & Calendar",
      tag: "2081/82 B.S.",
      tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      description: "Academic terms, sports calendar, cultural festivals, and parent-teacher conference dates.",
      to: "/events",
      icon: CalendarDays,
      iconColor: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
      highlight: "Full Schedule",
    },
    {
      id: "achievements",
      category: "campus",
      title: "Hall of Fame & Results",
      tag: "100% Success",
      tagColor: "bg-yellow-50 text-yellow-800 border-yellow-200",
      description: "Celebrating outstanding SEE board performance and district-level sports & quiz trophies.",
      to: "/achievements",
      icon: Trophy,
      iconColor: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white",
      highlight: "Distinction Record",
    },
    {
      id: "facilities",
      category: "campus",
      title: "Science & Computer Labs",
      tag: "Smart Campus",
      tagColor: "bg-purple-50 text-purple-700 border-purple-200",
      description: "Dedicated science laboratory, computer facility, library, and expansive playground.",
      to: "/facilities",
      icon: Microscope,
      iconColor: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
      highlight: "Hands-on Learning",
    },
    {
      id: "gallery",
      category: "campus",
      title: "Campus Life Photo Deck",
      tag: "Media Gallery",
      tagColor: "bg-rose-50 text-rose-700 border-rose-200",
      description: "High-resolution photo deck capturing classroom projects, assemblies, and annual celebrations.",
      to: "/gallery",
      icon: ImageIcon,
      iconColor: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
      highlight: "Visual Highlights",
    },
    {
      id: "contact",
      category: "notice",
      title: "Principal & Help Desk",
      tag: "Direct Support",
      tagColor: "bg-teal-50 text-teal-700 border-teal-200",
      description: "Connect with Principal Ivan Bhattarai and administration for inquiries and counseling.",
      to: "/contact",
      icon: Headphones,
      iconColor: "bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
      highlight: "+977 9842089044",
    },
  ];

  const filteredCards =
    activeFilter === "all"
      ? deckCards
      : deckCards.filter((card) => card.category === activeFilter);

  return (
    <section className="relative -mt-10 z-20 pb-16">
      <Container>
        {/* ClassDeck Main Container */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8 lg:p-10">
          {/* Header Bar */}
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-gold shadow-sm">
                <Sparkles size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
                    ClassDeck & iStudent Hub
                  </h2>
                  <span className="hidden sm:inline-flex rounded-full bg-navy/5 border border-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy">
                    v2.5
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Quick-access academic deck for students, guardians, and faculty
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-slate-100/80 p-1 text-xs">
              <button
                onClick={() => setActiveFilter("all")}
                className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${
                  activeFilter === "all"
                    ? "bg-white text-navy shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                All Decks ({deckCards.length})
              </button>
              <button
                onClick={() => setActiveFilter("academic")}
                className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${
                  activeFilter === "academic"
                    ? "bg-white text-navy shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                Academics
              </button>
              <button
                onClick={() => setActiveFilter("notice")}
                className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${
                  activeFilter === "notice"
                    ? "bg-white text-navy shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                Circulars
              </button>
              <button
                onClick={() => setActiveFilter("campus")}
                className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${
                  activeFilter === "campus"
                    ? "bg-white text-navy shadow-xs"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                Campus Life
              </button>
            </div>
          </div>

          {/* "Now & Next" ClassDeck Signature Widget */}
          <div className="mt-6 grid gap-4 lg:grid-cols-12">
            {/* Now Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-5 lg:col-span-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-blue-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                    ACADEMIC STATUS
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {settings.establishedYear || "Est. 2059 B.S."}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-navy">
                  Active Session: {settings.academicSession || "2081/2082 B.S."}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Classes running smoothly for Nursery through Grade 10 under English medium guidelines.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-blue-100/80 flex items-center justify-between text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Clock size={13} className="text-blue-600" />
                  Sun – Fri: 9:00 AM – 4:00 PM
                </span>
                <span className="font-semibold text-navy">Belbari-05, Kaseni</span>
              </div>
            </div>

            {/* Next / Live Announcement Widget */}
            <div className="flex flex-col justify-between rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-white p-5 lg:col-span-8">
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                    LATEST CIRCULAR
                  </span>
                  {latestNotice?.date && (
                    <span className="text-xs font-semibold text-amber-800/80">
                      {formatDate(latestNotice.date)}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-navy">
                      {latestNotice ? latestNotice.title : "Admissions Open for Academic Session 2083 B.S."}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-600 line-clamp-2">
                      {latestNotice
                        ? latestNotice.description
                        : "Prospective parents are invited to visit the school administration office or apply online for early admissions from Nursery to Grade 9."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-100/80 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Verified School Notice
                </span>
                <Link
                  to={latestNotice ? `/notices/${latestNotice._id || latestNotice.id}` : "/notices"}
                  className="inline-flex items-center gap-1 text-xs font-bold text-navy hover:text-gold transition"
                >
                  Read Full Circular <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* The 8 ClassDeck Cards Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredCards.map((card) => (
              <Link
                key={card.id}
                to={card.to}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl transition duration-300 ${card.iconColor}`}
                    >
                      <card.icon size={22} />
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${card.tagColor}`}
                    >
                      {card.tag}
                    </span>
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-navy group-hover:text-gold transition">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600 line-clamp-2">
                    {card.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-navy">
                  <span>{card.highlight}</span>
                  <ChevronRight
                    size={14}
                    className="transform transition duration-300 group-hover:translate-x-1 text-gold"
                  />
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Launcher Strip */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
              <span>
                Looking for teacher portals or parent records? Open the centralized modal.
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenPortal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-2 transition shadow-xs"
            >
              Launch iStudent Portal <Sparkles size={13} className="text-gold" />
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
