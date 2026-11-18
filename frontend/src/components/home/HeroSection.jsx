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
    <section className="relative overflow-hidden bg-gradient-to-b from-navy via-navy-2 to-navy py-20 text-white sm:py-28 lg:py-32">
      {/* Background with Ambient Glow */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay"
        style={{
          backgroundImage: cssUrl(heroImage),
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-navy/80" />

      {/* Decorative Blur Circles */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

      <Container className="relative z-10">
        <div className="max-w-3xl">
          {/* Eyebrow & Verified School Badge */}
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-gold/30 bg-navy/80 px-3.5 py-1.5 backdrop-blur-md shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold">
              {settings.heroEyebrow || (settings.establishedYear ? `Est. ${settings.establishedYear}` : "Est. 2059 B.S.")}
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-[11px] font-medium text-slate-200">
              {settings.address || "Belbari-05, Kaseni, Morang"}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl sm:leading-tight">
            {settings.heroTitle || "Kaseni Model Secondary English School"}
          </h1>

          {/* Subtitle / Description */}
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/40"
            >
              <GraduationCap size={16} className="text-gold" />
              <span>Explore iStudent Hub</span>
            </button>
          </div>

          {/* Quick Pillars Dock */}
          <div className="mt-10 grid grid-cols-2 gap-3 pt-6 border-t border-white/10 sm:grid-cols-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400 shrink-0" />
              <span>English Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400 shrink-0" />
              <span>Nursery – Grade 10</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400 shrink-0" />
              <span>100% SEE Success</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400 shrink-0" />
              <span>Science & Tech Labs</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
