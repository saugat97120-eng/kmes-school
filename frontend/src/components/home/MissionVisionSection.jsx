import Container from "../common/Container";
import { Target, Compass } from "lucide-react";

export default function MissionVisionSection() {
  return (
    <section className="relative overflow-hidden bg-navy py-20 text-white">
      <Container>
        <div className="grid gap-8 sm:grid-cols-2">
          {/* Mission Deck */}
          <div className="rounded-3xl p-8 border border-white/15 bg-navy-2/95 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/25 text-gold border border-gold/40">
                <Target size={24} />
              </div>
              <span className="rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold">
                Mission
              </span>
            </div>
            <h3 className="mt-5 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Our Core Mission
            </h3>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-100 font-medium">
              To provide an inspiring, disciplined, and inclusive English-medium learning environment where every child discovers their intellectual potential, fosters moral character, and builds confidence for lifelong success.
            </p>
          </div>

          {/* Vision Deck */}
          <div className="rounded-3xl p-8 border border-white/15 bg-navy-2/95 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/25 text-gold border border-gold/40">
                <Compass size={24} />
              </div>
              <span className="rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold">
                Vision
              </span>
            </div>
            <h3 className="mt-5 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Our Long-term Vision
            </h3>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-100 font-medium">
              To be the premier benchmark model secondary school in eastern Nepal, celebrated for 100% academic board excellence, innovative science & tech facilities, and students who actively enrich society.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
