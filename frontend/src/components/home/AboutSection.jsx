import Container from "../common/Container";
import Button from "../common/Button";
import { useSiteSettings } from "../../context/useSiteSettings";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function AboutSection() {
  const { settings } = useSiteSettings();
  const schoolName = settings.schoolName || "Kaseni Model Secondary English School";
  const establishedYear = settings.establishedYear || "2059 B.S.";

  return (
    <section className="py-20 bg-white">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Column: Story & Commitments */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-navy/5 border border-navy/10 px-3 py-1 text-xs font-bold text-navy">
              <Sparkles size={13} className="text-gold" />
              <span>About Our Institution</span>
            </div>

            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Dedicated to Academic Discipline & Holistic Growth
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-800 sm:text-base">
              Established in <strong className="text-navy">{establishedYear}</strong> in the peaceful community of Belbari-05, Kaseni, Morang, <strong className="text-navy">{schoolName}</strong> has stood for over two decades as a beacon of progressive, values-based English-medium education.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-800">
              Under the stewardship of Principal Ivan Bhattarai and dedicated faculty, our pedagogy bridges foundational literacy and numeracy with modern science practicals, interactive computer literacy, and dynamic co-curricular activities.
            </p>

            {/* Feature Bullets */}
            <div className="mt-6 space-y-2.5 text-xs font-semibold text-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Nursery through Grade 10 National SEE Board Curriculum</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Dedicated Science Laboratory & Multimedia Computer Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Safe student transport and monitored campus environment</span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Button to="/about" variant="primary" showArrow className="rounded-xl px-5 py-2.5 text-xs font-bold">
                Read School History
              </Button>
              <Button to="/admissions" variant="outline" className="rounded-xl px-5 py-2.5 text-xs font-bold">
                Admissions Info
              </Button>
            </div>
          </div>

          {/* Right Column: Campus Showcase Card */}
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200 shadow-xl bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80"
                alt="Kaseni Model School Campus Life"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" />
              
              {/* Floating Badge */}
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl bg-white/95 p-4 backdrop-blur-md shadow-lg border border-white/60">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gold">
                    Government Registered
                  </p>
                  <p className="text-xs font-bold text-navy">
                    Belbari Municipality Ward No. 05, Morang
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
