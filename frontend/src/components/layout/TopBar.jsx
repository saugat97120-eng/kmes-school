import { Phone, Mail, Share2, Calendar, GraduationCap } from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";
import { useIStudent } from "../../context/useIStudent";
import { isPlaceholder } from "../../utils/format";

export default function TopBar() {
  const { settings } = useSiteSettings();
  const { openPortal } = useIStudent();

  const phone = !isPlaceholder(settings.phone) ? settings.phone : "+977 9842089044";
  const email = !isPlaceholder(settings.email) ? settings.email : "ivanbhattarai042@gmail.com";
  const session = settings.academicSession || "2081/2082 B.S.";
  const established = settings.establishedYear || "Est. 2059 B.S.";
  const rawPhone = phone.split(/[,/]/)[0].trim().replace(/[^0-9+]/g, "");

  return (
    <div className="hidden bg-navy-2 py-2 text-xs text-slate-300 sm:block border-b border-white/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5">
          <a
            href={`tel:${rawPhone}`}
            className="flex items-center gap-1.5 hover:text-white transition"
          >
            <Phone size={13} className="text-gold" /> {phone}
          </a>

          <a
            href={`mailto:${email}`}
            className="flex items-center gap-1.5 hover:text-white transition"
          >
            <Mail size={13} className="text-gold" /> {email}
          </a>

          <span className="flex items-center gap-1.5 text-slate-400">
            <Calendar size={13} className="text-gold" /> {established} • सत्र: {session}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={openPortal}
            className="flex items-center gap-1 text-gold hover:text-white transition font-medium"
          >
            <GraduationCap size={13} /> iStudent Portal Quick Launch
          </button>

          <span className="text-slate-600">|</span>

          <a
            href={settings.facebookUrl || "https://www.facebook.com/61554117025008"}
            className="flex items-center gap-1.5 hover:text-gold transition"
            target="_blank"
            rel="noreferrer"
          >
            <Share2 size={13} /> Follow on Facebook
          </a>
        </div>
      </div>
    </div>
  );
}
