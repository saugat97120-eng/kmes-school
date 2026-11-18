import Container from "../common/Container";
import { GraduationCap, BookOpen, Award, Calendar, CheckCircle2 } from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";

export default function QuickFacts() {
  const { settings } = useSiteSettings();

  const facts = [
    {
      icon: GraduationCap,
      label: "Grade Span",
      value: "Nursery – Grade 10",
      tag: "Basic to Secondary",
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      icon: BookOpen,
      label: "Instruction Medium",
      value: "100% English",
      tag: "National SEE Board",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    {
      icon: Award,
      label: "Institutional Legacy",
      value: settings.establishedYear || "2059 B.S.",
      tag: "22+ Years of Excellence",
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      icon: Calendar,
      label: "Academic Session",
      value: settings.academicSession || "2081/2082",
      tag: "Nepali Vikram Sambat",
      color: "bg-purple-50 text-purple-600 border-purple-100",
    },
  ];

  return (
    <section className="py-10 bg-slate-50/60 border-y border-slate-100">
      <Container>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="deck-card flex flex-col justify-between p-5 transition-all hover:border-gold/40"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border ${fact.color}`}
                >
                  <fact.icon size={20} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  KMES Metric
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {fact.label}
                </p>
                <p className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
                  {fact.value}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>{fact.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
