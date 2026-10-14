import { useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, X, ArrowRight } from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";

function EmergencyAlertBar() {
  const { settings } = useSiteSettings();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return Boolean(sessionStorage.getItem("kmes_alert_dismissed"));
  });

  const handleDismiss = () => {
    sessionStorage.setItem("kmes_alert_dismissed", "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  const statusText = settings.admissionsStatus || "Admissions Open for Nursery to Grade 10";
  const sessionText = settings.academicSession ? `Session ${settings.academicSession}` : "New Session";

  return (
    <div className="relative bg-gradient-to-r from-navy to-navy-2 px-4 py-2 text-white shadow-sm print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between text-xs sm:text-sm">
        <div className="flex flex-1 items-center justify-center gap-2 pr-6 sm:justify-start">
          <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-0.5 font-semibold text-gold">
            <BellRing size={13} className="animate-pulse" /> Announcement
          </span>
          <span className="font-medium truncate max-w-[240px] sm:max-w-none">
            {statusText} ({sessionText}) — Enrolling now!
          </span>
          <Link
            to="/admissions"
            className="hidden items-center gap-1 font-semibold text-gold underline-offset-4 hover:underline sm:inline-flex"
          >
            Apply Online <ArrowRight size={13} />
          </Link>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded p-1 text-gray-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss announcement"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export default EmergencyAlertBar;
