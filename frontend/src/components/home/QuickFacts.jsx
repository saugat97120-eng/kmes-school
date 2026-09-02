import Container from "../common/Container";
import { GraduationCap, Users, BookOpen, Building2 } from "lucide-react";

const facts = [
  { icon: GraduationCap, label: "Grade Range", value: "Nursery – Grade 10" },
  { icon: BookOpen, label: "Medium", value: "English" },
  { icon: Users, label: "Type", value: "Co-educational" },
  { icon: Building2, label: "Attendance", value: "Day Scholars" },
];

function QuickFacts() {
  return (
    <section className="border-b border-gray-100 py-14">
      <Container>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy text-gold">
                <fact.icon size={22} />
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {fact.label}
              </p>
              <p className="mt-1 font-serif text-lg font-bold text-navy">
                {fact.value}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default QuickFacts;
