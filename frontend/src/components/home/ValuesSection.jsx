import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import { Heart, ShieldCheck, Sparkles, Users2 } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Moral Integrity",
    description: "Cultivating honesty, accountability, and empathy in every classroom interaction.",
    color: "bg-rose-50 text-rose-600 border-rose-100",
  },
  {
    icon: ShieldCheck,
    title: "Academic Discipline",
    description: "Consistent effort, punctual habits, and dedication to personal and academic growth.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    icon: Sparkles,
    title: "Pursuit of Excellence",
    description: "Striving for distinction in examinations, sports, debate, and scientific inquiries.",
    color: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    icon: Users2,
    title: "Community Spirit",
    description: "Collaborative teamwork between students, devoted teachers, and supportive guardians.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
];

export default function ValuesSection() {
  return (
    <section className="py-20 bg-slate-50/60 border-t border-slate-100">
      <Container>
        <SectionHeading
          eyebrow="Institutional Values"
          title="The Core Pillars of KMES"
          description="The guiding principles that shape student conduct, teaching philosophy, and institutional progress."
          centered
        />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="deck-card flex flex-col justify-between p-6 text-center transition-all duration-300"
            >
              <div>
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${v.color}`}
                >
                  <v.icon size={26} />
                </div>
                <h3 className="mt-5 text-base font-bold text-navy">
                  {v.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {v.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Core KMES Value
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
