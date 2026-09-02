import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import { BookOpen, FlaskConical, Languages } from "lucide-react";

const programs = [
  { icon: BookOpen, title: "Basic Level", description: "Nursery to Grade 8, building strong fundamentals." },
  { icon: FlaskConical, title: "Secondary Level", description: "Grade 9-10 following the national SEE curriculum." },
  { icon: Languages, title: "English Medium", description: "Instruction delivered fully in English." },
];

function AcademicSection() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Academics"
          title="Our Academic Programs"
          centered
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {programs.map((p) => (
            <div key={p.title} className="rounded-2xl border border-gray-200 p-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-gold">
                <p.icon size={24} />
              </div>
              <h3 className="mt-5 font-serif text-lg font-bold text-navy">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{p.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default AcademicSection;
