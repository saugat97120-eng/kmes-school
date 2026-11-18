import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import { BookOpen, FlaskConical, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const programs = [
  {
    icon: Sparkles,
    badge: "Foundational Tier",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    title: "Pre-Primary & Primary",
    grades: "Nursery – Grade 5",
    description:
      "Nurturing early curiosity through play-way learning, phonics, foundational arithmetic, and creative storytelling in English.",
    highlights: ["Phonics & Vocabulary", "Activity-Based Math", "Arts & Motor Skills"],
  },
  {
    icon: BookOpen,
    badge: "Intermediate Tier",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    title: "Lower Secondary Level",
    grades: "Grade 6 – Grade 8",
    description:
      "Transitioning students to analytical thinking, digital literacy in computer labs, science practicals, and structured writing.",
    highlights: ["Computer Applications", "General Science Practical", "Social & Civic Studies"],
  },
  {
    icon: FlaskConical,
    badge: "SEE Graduation Tier",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    title: "Secondary Board Level",
    grades: "Grade 9 – Grade 10",
    description:
      "Rigorous preparation for the national Secondary Education Examination (SEE) with model exams, science labs, and mentorship.",
    highlights: ["100% Board Success", "Science & Math Focus", "Career & SEE Guidance"],
  },
];

export default function AcademicSection() {
  return (
    <section className="py-20 bg-white">
      <Container>
        <SectionHeading
          eyebrow="Academic Structure"
          title="Curriculum Decks (Nursery to Grade 10)"
          description="Structured in compliance with Nepal Government Curriculum Development Center (CDC) guidelines with 100% English medium delivery."
          centered
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <div
              key={p.title}
              className="deck-card group flex flex-col justify-between p-7 transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-gold shadow-xs group-hover:scale-105 transition">
                    <p.icon size={22} />
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${p.badgeColor}`}
                  >
                    {p.badge}
                  </span>
                </div>

                <div className="mt-5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {p.grades}
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-navy group-hover:text-gold transition">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {p.description}
                  </p>
                </div>

                <div className="mt-5 space-y-2 pt-4 border-t border-slate-100">
                  {p.highlights.map((h) => (
                    <div
                      key={h}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700"
                    >
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/academics"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-navy group-hover:text-gold transition"
                >
                  Explore Syllabi & Programs <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
