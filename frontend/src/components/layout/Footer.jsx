import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Share2, Clock, GraduationCap, ShieldCheck } from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";
import { useIStudent } from "../../context/useIStudent";
import { isPlaceholder } from "../../utils/format";

export default function Footer() {
  const { settings } = useSiteSettings();
  const { openPortal } = useIStudent();

  const phone = !isPlaceholder(settings.phone) ? settings.phone : "+977 9842089044, 9817361024";
  const email = !isPlaceholder(settings.email) ? settings.email : "ivanbhattarai042@gmail.com";
  const rawPhone = phone.split(/[,/]/)[0].trim().replace(/[^0-9+]/g, "");

  return (
    <footer className="bg-navy border-t border-white/10 text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: School Identity */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/25 text-gold border border-gold/40 font-bold text-lg">
                {(settings.shortName || "K").slice(0, 1)}
              </div>
              <div>
                <span className="text-base font-extrabold text-white block">
                  {settings.shortName || "KMES"} School
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {settings.establishedYear || "Est. 2059 B.S."}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-200 font-normal">
              {settings.footerDescription ||
                "An academic institution committed to quality English-medium education from Nursery to Grade 10 in Belbari-05, Kaseni, Morang."}
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={openPortal}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white hover:bg-gold hover:text-navy transition border border-white/25 cursor-pointer shadow-xs"
              >
                <GraduationCap size={15} className="text-gold" />
                <span>Launch iStudent Hub</span>
              </button>
            </div>
          </div>

          {/* Col 2: Academic Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Academic Decks</h4>
            <div className="mt-4 flex flex-col gap-2.5 text-xs">
              <Link to="/about" className="text-slate-200 hover:text-gold transition font-medium">About Institution</Link>
              <Link to="/academics" className="text-slate-200 hover:text-gold transition font-medium">Curriculum & Syllabi</Link>
              <Link to="/admissions" className="text-gold hover:text-white transition font-bold">Admissions 2083</Link>
              <Link to="/notices" className="text-slate-200 hover:text-gold transition font-medium">Official Notice Circulars</Link>
              <Link to="/events" className="text-slate-200 hover:text-gold transition font-medium">School Calendar & Terms</Link>
            </div>
          </div>

          {/* Col 3: Student Life */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Student Life</h4>
            <div className="mt-4 flex flex-col gap-2.5 text-xs">
              <Link to="/facilities" className="text-slate-200 hover:text-gold transition font-medium">Science & Computer Labs</Link>
              <Link to="/activities" className="text-slate-200 hover:text-gold transition font-medium">ECA/CCA & Sports Clubs</Link>
              <Link to="/gallery" className="text-slate-200 hover:text-gold transition font-medium">School Photo Deck</Link>
              <Link to="/achievements" className="text-slate-200 hover:text-gold transition font-medium">SEE Board Hall of Fame</Link>
              <Link to="/admin/login" className="hover:text-gold transition flex items-center gap-1.5 text-slate-300 font-medium">
                <ShieldCheck size={13} /> Staff Portal Login
              </Link>
            </div>
          </div>

          {/* Col 4: Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Contact & Location</h4>
            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-100 font-medium">
              <span className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-gold" />
                {settings.address || "Kaseni, Nepal"}
              </span>

              <a href={`tel:${rawPhone}`} className="flex items-center gap-2 hover:text-gold transition">
                <Phone size={15} className="shrink-0 text-gold" />
                {phone}
              </a>

              <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-gold transition">
                <Mail size={15} className="shrink-0 text-gold" />
                {email}
              </a>

              {settings.workingHours && (
                <span className="flex items-center gap-2 text-slate-200">
                  <Clock size={15} className="shrink-0 text-gold" />
                  {settings.workingHours}
                </span>
              )}

              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-gold hover:text-white transition font-bold"
                >
                  <Share2 size={15} /> Official Facebook Page
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/15 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300 font-medium">
          <p>© {new Date().getFullYear()} {settings.schoolName || "Kaseni Model Secondary English School"}. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span>Belbari-05, Morang, Nepal</span>
            <span>•</span>
            <Link to="/admin/login" className="text-slate-300 hover:text-gold transition">
              Staff Access
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
