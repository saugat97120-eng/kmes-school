import { Trophy } from "lucide-react";

export default function AchievementCard({ achievement }) {
  return (
    <article className="deck-card group flex flex-col justify-between p-6 text-center transition-all duration-300">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/70 group-hover:bg-navy group-hover:text-gold transition duration-300">
          <Trophy size={26} />
        </div>

        <div className="mt-4">
          <span className="inline-block rounded-full bg-slate-100 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            {achievement.year || "Excellence"}
          </span>
        </div>

        <h3 className="mt-3 text-base font-bold text-navy group-hover:text-gold transition">
          {achievement.title}
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-600">
          {achievement.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <span className="text-[11px] font-semibold text-emerald-600">
          ★ Verified Milestone
        </span>
      </div>
    </article>
  );
}
