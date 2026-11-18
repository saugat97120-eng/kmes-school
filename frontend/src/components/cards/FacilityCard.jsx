import { IMAGE_FALLBACK, handleImageError } from "../../utils/format";
import { Sparkles } from "lucide-react";

export default function FacilityCard({ facility }) {
  return (
    <article className="deck-card group flex flex-col justify-between overflow-hidden transition-all duration-300">
      <div>
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <img
            src={facility.image || IMAGE_FALLBACK}
            alt={facility.title}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-navy shadow-xs border border-white/60">
              <Sparkles size={11} className="text-gold" /> Campus Facility
            </span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-base font-bold text-navy group-hover:text-gold transition">
            {facility.title}
          </h3>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            {facility.description}
          </p>
        </div>
      </div>

      <div className="p-5 pt-0">
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span>Kaseni Model Campus</span>
          <span className="text-emerald-600">Active</span>
        </div>
      </div>
    </article>
  );
}
