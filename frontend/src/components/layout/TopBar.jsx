import { Phone, Mail, Share2 } from "lucide-react";
import { useSiteSettings } from "../../context/SiteSettingsContext";

function TopBar() {
  const { settings } = useSiteSettings();

  return (
    <div className="hidden bg-navy-2 py-2 text-xs text-gray-200 sm:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <Phone size={13} /> {settings.phone}
          </span>

          <span className="flex items-center gap-1.5">
            <Mail size={13} /> {settings.email}
          </span>
        </div>
        <a
          href={settings.facebookUrl || "#"}
          className="flex items-center gap-1.5 hover:text-gold"
          target="_blank"
          rel="noreferrer"
        >
          <Share2 size={13} /> Follow us on Facebook
        </a>
      </div>
    </div>
  );
}

export default TopBar;
