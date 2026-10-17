import { Phone, Mail, Share2, Calendar } from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";
import { isPlaceholder } from "../../utils/format";

function TopBar() {
  const { settings } = useSiteSettings();

  const phone = !isPlaceholder(settings.phone) ? settings.phone : null;
  const email = !isPlaceholder(settings.email) ? settings.email : "info@kmes.edu.np";
  const session = settings.academicSession || "2081/2082 B.S.";
  const established = settings.establishedYear || "Est. 2059 B.S.";

  return (
    <div className="hidden bg-navy-2 py-2 text-xs text-gray-200 sm:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5">
          {phone && (
            <a href={`tel:${phone.split(/[,/]/)[0].trim().replace(/[^0-9+]/g, "")}`} className="flex items-center gap-1.5 hover:text-white transition">
              <Phone size={13} className="text-gold" /> {phone}
            </a>
          )}

          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-white transition">
              <Mail size={13} className="text-gold" /> {email}
            </a>
          )}

          <span className="flex items-center gap-1 text-gray-400">
            <Calendar size={13} className="text-gold" /> {established} • सत्र: {session}
          </span>
        </div>

        <div className="flex items-center gap-4">
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

export default TopBar;
