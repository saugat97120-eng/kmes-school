import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import useApiList from "../../hooks/useApiList";
import { fetchActivities } from "../../utils/apiHelpers";
import { Sparkles } from "lucide-react";

const loadActivities = () => fetchActivities();

export default function ActivitiesSection() {
  const { items, loading } = useApiList(loadActivities);
  if (loading || items.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <Container>
        <SectionHeading
          eyebrow="Co-Curricular Deck"
          title="Beyond the Classroom"
          description="Developing leadership, sportsmanship, and creative expression through diverse clubs and competitions."
          centered
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((a) => (
            <div
              key={a._id || a.id}
              className="deck-card group flex flex-col justify-between p-6 transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:bg-navy group-hover:text-gold transition">
                    <Sparkles size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ECA / CCA
                  </span>
                </div>

                <h3 className="mt-4 text-base font-bold text-navy group-hover:text-gold transition">
                  {a.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {a.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
                <span>Active Student Program</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button to="/activities" variant="outline" showArrow>
            Explore All Clubs & Activities
          </Button>
        </div>
      </Container>
    </section>
  );
}
