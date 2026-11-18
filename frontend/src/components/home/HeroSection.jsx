import Container from "../common/Container";
import Button from "../common/Button";
import { useSiteSettings } from "../../context/useSiteSettings";
import { useIStudent } from "../../context/useIStudent";
import { cssUrl } from "../../utils/format";
import {
  GraduationCap,
  CheckCircle,
} from "lucide-react";

export default function HeroSection() {
  const { settings } = useSiteSettings();
  const { openPortal } = useIStudent();

  const heroImage =
    settings.heroImage ||
    "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80";

  return (
    <section className="relative overflow-hidden bg-navy py-20 text-white sm:py-28 lg:py-32">
      {/* Background Image with Dark Contrast Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: cssUrl(heroImage),
        }}
      />
      {/* Deep Rich Gradient Overlay for 100% Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/95 via-navy/90 to-navy" />

      {/* Decorative Blur Circles */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

      <Container className="relative z-10">
        <div className="max-w-3xl">
          {/* Eyebrow & Verified School Badge */}
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-gold/50 bg-navy-2/90 px-4 py-1.5 backdrop-blur-md shadow-md">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-gold">
              {settings.heroEyebrow || (settings.establishedYear ? `Est. ${settings.establishedYear}` : "Est. 2059 B.S.")}
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-semibold text-white">
              {settings.address || "Kaseni, Nepal"}
            </span>
          </div>

          {/* Main Title - Pure High-Contrast White */}
          <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl sm:leading-tight drop-shadow-md">
            {settings.heroTitle || "Kaseni Model Secondary English School"}
          </h1>

          {/* Subtitle / Description - Crisp High-Contrast White/Slate-100 */}
          <p className="mt-5 max-w-2xl text-base font-normal leading-relaxed text-slate-100 sm:text-lg drop-shadow-xs">
            {settings.heroDescription ||
              "Nurturing academic excellence, moral discipline, and 21st-century skills from Nursery to Grade 10 in a modern, technology-enabled environment."}
          </p>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Button
              to="/admissions"
              variant="gold"
              showArrow
              className="rounded-xl px-6 py-3.5 text-xs font-bold uppercase tracking-wider shadow-lg shadow-gold/20"
            >
              Apply for Admission 2083
            </Button>

            <button
              type="button"
              onClick={openPortal}
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/15 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition hover:bg-white hover:text-navy shadow-md cursor-pointer"
            >
              <GraduationCap size={16} className="text-gold" />
              <span>Explore iStudent Hub</span>
            </button>
          </div>

          {/* Quick Pillars Dock - Bold White with Green Checkmarks */}
          <div className="mt-10 grid grid-cols-2 gap-3 pt-6 border-t border-white/15 sm:grid-cols-4 text-xs font-semibold text-white">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span>English Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span>Nursery – Grade 10</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span>100% SEE Success</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span>Science & Tech Labs</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
