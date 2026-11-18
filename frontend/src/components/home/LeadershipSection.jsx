import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import { useSiteSettings } from "../../context/useSiteSettings";
import { Quote, PhoneCall, Award, Sparkles } from "lucide-react";

export default function LeadershipSection() {
  const { settings } = useSiteSettings();

  const principalInitial = (settings.principalName?.trim()?.slice(0, 1) || "P").toUpperCase();
  const directorInitial = (settings.directorName?.trim()?.slice(0, 1) || "D").toUpperCase();

  const phone = settings.phone || "+977 9842089044";
  const rawPhone = phone.split(/[,/]/)[0].trim().replace(/[^0-9+]/g, "");

  return (
    <section className="bg-slate-50/70 py-20 border-t border-slate-100">
      <Container>
        <SectionHeading
          eyebrow="Leadership & Direction"
          title="Guided by Committed Educators"
          description="A message from the school leadership on our vision for quality education in Belbari-05, Kaseni."
          centered
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Principal Executive Card */}
          <div className="deck-card relative flex flex-col justify-between p-7 sm:p-8">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    {settings.principalPhoto ? (
                      <img
                        src={settings.principalPhoto}
                        alt={settings.principalName || "Principal"}
                        className="h-16 w-16 rounded-2xl border-2 border-gold/40 object-cover shadow-sm"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`h-16 w-16 items-center justify-center rounded-2xl bg-navy border-2 border-gold/40 text-xl font-bold text-gold shadow-sm ${
                        settings.principalPhoto ? "hidden" : "flex"
                      }`}
                    >
                      {principalInitial}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-lg font-bold text-navy sm:text-xl">
                        {settings.principalName || "Ivan Bhattarai"}
                      </h3>
                      <Award size={16} className="text-gold" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      {settings.principalTitle || "Principal"} • Kaseni Model School
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-100 p-2 text-slate-400">
                  <Quote size={20} className="text-gold/60" />
                </div>
              </div>

              <blockquote className="mt-5 text-xs sm:text-sm leading-6 text-slate-600 italic">
                "{settings.principalMessage ||
                  "Our school is committed to building confident learners, responsible citizens, and compassionate leaders through quality education and character development."}"
              </blockquote>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                Principal's Desk
              </span>
              <a
                href={`tel:${rawPhone}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:text-gold transition"
              >
                <PhoneCall size={13} className="text-gold" /> Contact Office
              </a>
            </div>
          </div>

          {/* Director Executive Card */}
          <div className="deck-card relative flex flex-col justify-between p-7 sm:p-8">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    {settings.directorPhoto ? (
                      <img
                        src={settings.directorPhoto}
                        alt={settings.directorName || "Director"}
                        className="h-16 w-16 rounded-2xl border-2 border-gold/40 object-cover shadow-sm"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`h-16 w-16 items-center justify-center rounded-2xl bg-navy border-2 border-gold/40 text-xl font-bold text-gold shadow-sm ${
                        settings.directorPhoto ? "hidden" : "flex"
                      }`}
                    >
                      {directorInitial}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-lg font-bold text-navy sm:text-xl">
                        {settings.directorName || "Director"}
                      </h3>
                      <Sparkles size={16} className="text-gold" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      {settings.directorTitle || "School Management Committee"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-100 p-2 text-slate-400">
                  <Quote size={20} className="text-gold/60" />
                </div>
              </div>

              <blockquote className="mt-5 text-xs sm:text-sm leading-6 text-slate-600 italic">
                "{settings.directorMessage ||
                  "We believe meaningful education blends academic excellence with discipline, creativity, and community spirit to prepare students for the future."}"
              </blockquote>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                School Governance
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Belbari-05 Kaseni
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
