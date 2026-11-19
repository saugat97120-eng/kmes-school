import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  GraduationCap,
  Sparkles,
  PhoneCall,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";
import { useIStudent } from "../../context/useIStudent";

const navLinks = [
  { label: "Home", to: "/" },
  {
    label: "About Us",
    to: "/about",
    children: [
      { label: "School Profile & History", to: "/about", description: "Est. 2059 B.S. in Belbari-05, Kaseni" },
      { label: "Leadership Messages", to: "/about#leadership", description: "Principal & School Committee" },
      { label: "School Facilities & Labs", to: "/facilities", description: "Science lab, computer room & library" },
    ],
  },
  {
    label: "Academics",
    to: "/academics",
    children: [
      { label: "Academic Curricula", to: "/academics", description: "Nursery through Grade 10 SEE" },
      { label: "Admissions 2083", to: "/admissions", description: "Online application & guidelines" },
      { label: "Activities & Sports", to: "/activities", description: "Clubs, competitions & ECA/CCA" },
    ],
  },
  { label: "Notices", to: "/notices" },
  { label: "Events", to: "/events" },
  {
    label: "School Life",
    to: "/gallery",
    children: [
      { label: "Photo & Media Deck", to: "/gallery", description: "Classroom & school moments" },
      { label: "Hall of Fame & Awards", to: "/achievements", description: "SEE toppers & sports accolades" },
    ],
  },
  { label: "Contact", to: "/contact" },
];

export default function Navbar() {
  const { settings } = useSiteSettings();
  const { openPortal } = useIStudent();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSubOpen, setMobileSubOpen] = useState(null);

  const phone = settings.phone || "+977 9842089044";
  const rawPhone = phone.split(/[,/]/)[0].trim().replace(/[^0-9+]/g, "");

  const linkClass = ({ isActive }) =>
    `relative text-xs font-bold uppercase tracking-wider transition-all duration-200 py-1.5 px-2.5 rounded-lg ${
      isActive
        ? "text-navy bg-slate-100 font-extrabold"
        : "text-slate-700 hover:text-navy hover:bg-slate-50"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo & School Name */}
        <Link to="/" className="flex items-center gap-3 group">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.shortName || settings.schoolName}
              className="h-10 w-10 rounded-xl object-cover ring-2 ring-gold/40 shadow-xs transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy font-serif text-lg font-bold text-gold ring-2 ring-gold/40 shadow-xs transition group-hover:scale-105">
              {(settings.shortName || "K").slice(0, 1)}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-navy leading-tight">
              {settings.shortName || "KMES"}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Model Sec. School
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1.5 lg:flex">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.to} className="group relative">
                <NavLink
                  to={link.to}
                  className={(state) => `${linkClass(state)} flex items-center gap-1`}
                >
                  {link.label}
                  <ChevronDown
                    size={13}
                    className="transition-transform duration-200 group-hover:rotate-180 text-slate-400"
                  />
                </NavLink>
                {/* Dropdown Menu */}
                <div className="invisible absolute left-0 top-full z-50 w-64 translate-y-2 rounded-2xl border border-slate-200/90 bg-white p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {link.children.map((child) => (
                    <Link
                      key={child.to}
                      to={child.to}
                      className="group/item flex flex-col rounded-xl px-3 py-2 transition hover:bg-slate-50"
                    >
                      <span className="text-xs font-bold text-navy group-hover/item:text-gold transition">
                        {child.label}
                      </span>
                      {child.description && (
                        <span className="text-[11px] text-slate-500">
                          {child.description}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        {/* Right Action Buttons: Desktop only */}
        <div className="hidden items-center gap-2.5 lg:flex">
          {/* iStudent Portal Trigger Pill */}
          <button
            type="button"
            onClick={openPortal}
            className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-navy via-navy-2 to-navy px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:shadow-md hover:scale-[1.02] border border-navy/40"
          >
            <GraduationCap size={16} className="text-gold transition-transform group-hover:rotate-12" />
            <span>iStudent</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>

          {/* Admissions / Contact Button */}
          <Link
            to="/admissions"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gold/15 px-3.5 py-2 text-xs font-bold text-navy hover:bg-gold hover:text-navy transition shadow-xs border border-gold/40"
          >
            <Sparkles size={13} className="text-amber-600" />
            <span>Admissions</span>
          </Link>
        </div>

        {/* Mobile / Tablet: Hamburger and single quick action */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={openPortal}
            className="inline-flex items-center gap-1 rounded-xl bg-navy px-2.5 py-1.5 text-xs font-bold text-white shadow-xs"
          >
            <GraduationCap size={14} className="text-gold" />
            <span>iStudent</span>
          </button>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-navy hover:bg-slate-50 transition"
            onClick={() => setMobileOpen(true)}
            aria-label="Open mobile navigation"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white lg:hidden animate-in fade-in duration-200">
          {/* Top drawer header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-gold font-serif font-bold text-base">
                {(settings.shortName || "K").slice(0, 1)}
              </div>
              <div>
                <span className="font-bold text-base text-navy">
                  {settings.shortName || "KMES"} School
                </span>
                <p className="text-[11px] text-slate-500">Belbari-05, Kaseni, Morang</p>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick iStudent Launcher in Mobile Menu */}
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <button
              onClick={() => {
                setMobileOpen(false);
                openPortal();
              }}
              className="w-full flex items-center justify-between rounded-2xl bg-gradient-to-r from-navy to-navy-2 p-3 text-white shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/20 text-gold border border-gold/30">
                  <GraduationCap size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold">Open iStudent & ClassDeck</p>
                  <p className="text-[10px] text-slate-300">Fast access to notices, admissions & calendar</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-gold" />
            </button>
          </div>

          {/* Drawer Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-slate-100">
            {navLinks.map((link) => (
              <div key={link.to} className="py-2">
                <div className="flex items-center justify-between">
                  <Link
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-bold text-navy hover:text-gold transition py-1"
                  >
                    {link.label}
                  </Link>
                  {link.children && (
                    <button
                      onClick={() =>
                        setMobileSubOpen(mobileSubOpen === link.to ? null : link.to)
                      }
                      className="p-1 text-slate-400"
                    >
                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-200 ${
                          mobileSubOpen === link.to ? "rotate-180 text-navy" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>

                {link.children && mobileSubOpen === link.to && (
                  <div className="mt-2 space-y-1 rounded-xl bg-slate-50 p-2 text-xs">
                    {link.children.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-white hover:text-navy font-medium"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Action Sheet */}
          <div className="border-t border-slate-100 bg-slate-50/80 p-4 space-y-2">
            <Link
              to="/admissions"
              onClick={() => setMobileOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-center text-xs font-bold text-navy shadow-xs"
            >
              <FileCheck2 size={16} /> Apply for Admission 2083
            </Link>

            <a
              href={`tel:${rawPhone}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <PhoneCall size={14} className="text-gold" /> Call School: {phone}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
