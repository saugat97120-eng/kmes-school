import Container from "../common/Container";
import { Target, Compass } from "lucide-react";

export default function MissionVisionSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy via-navy-2 to-navy py-20 text-white">
      <Container>
        <div className="grid gap-8 sm:grid-cols-2">
          {/* Mission Deck */}
          <div className="glass-panel-dark rounded-3xl p-8 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20 text-gold border border-gold/30">
                <Target size={24} />
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold">
                Mission
              </span>
            </div>
            <h3 className="mt-5 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Our Core Mission
            </h3>
            <p className="mt-3 text-xs sm:text-sm leading-6 text-slate-300">
              To provide an inspiring, disciplined, and inclusive English-medium learning environment where every child discovers their intellectual potential, fosters moral character, and builds confidence for lifelong success.
            </p>
          </div>

          {/* Vision Deck */}
          <div className="glass-panel-dark rounded-3xl p-8 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20 text-gold border border-gold/30">
                <Compass size={24} />
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold">
                Vision
              </span>
            </div>
            <h3 className="mt-5 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Our Long-term Vision
            </h3>
            <p className="mt-3 text-xs sm:text-sm leading-6 text-slate-300">
              To be the premier benchmark model secondary school in eastern Nepal, celebrated for 100% academic board excellence, innovative science & tech facilities, and students who actively enrich society.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
