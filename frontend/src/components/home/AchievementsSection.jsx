import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import AchievementCard from "../cards/AchievementCard";
import useApiList from "../../hooks/useApiList";
import { fetchAchievements } from "../../utils/apiHelpers";

const loadAchievements = () => fetchAchievements();

function AchievementsSection() {
  const { items, loading } = useApiList(loadAchievements);
  if (loading || items.length === 0) return null;

  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow="Achievements" title="Our Recognitions" centered />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((a) => (
            <AchievementCard key={a._id} achievement={a} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export default AchievementsSection;
