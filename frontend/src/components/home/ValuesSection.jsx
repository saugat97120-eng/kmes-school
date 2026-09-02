import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import { Heart, ShieldCheck, Sparkles, Users2 } from "lucide-react";

const values = [
  { icon: Heart, title: "Integrity" },
  { icon: ShieldCheck, title: "Discipline" },
  { icon: Sparkles, title: "Excellence" },
  { icon: Users2, title: "Community" },
];

function ValuesSection() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow="Our Values" title="What We Stand For" centered />
        <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-bg-light text-gold">
                <v.icon size={24} />
              </div>
              <p className="mt-3 font-serif font-bold text-navy">{v.title}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default ValuesSection;
