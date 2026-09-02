import { Award } from "lucide-react";

function AchievementCard({ achievement }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy text-gold">
        <Award size={28} />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-gold">
        {achievement.year}
      </p>
      <h3 className="mt-2 font-serif text-xl font-bold text-navy">{achievement.title}</h3>
      <p className="mt-3 text-sm leading-6 text-gray-600">{achievement.description}</p>
    </article>
  );
}

export default AchievementCard;
