import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import AchievementCard from "../cards/AchievementCard";
import useApiList from "../../hooks/useApiList";
import { fetchAchievements } from "../../utils/apiHelpers";

const loadAchievements = () => fetchAchievements();

export default function AchievementsSection() {
  const { items, loading } = useApiList(loadAchievements);
  if (loading || items.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <Container>
        <SectionHeading
          eyebrow="Hall of Fame Deck"
          title="Academic & Co-Curricular Excellence"
          description="Honoring our students' outstanding performance in the national SEE Board examinations, district sports, and creative arts."
          centered
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((a) => (
            <AchievementCard key={a._id || a.id} achievement={a} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button to="/achievements" variant="outline" showArrow>
            Explore Complete Hall of Fame
          </Button>
        </div>
      </Container>
    </section>
  );
}
