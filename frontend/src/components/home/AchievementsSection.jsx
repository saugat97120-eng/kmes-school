import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import AchievementCard from "../cards/AchievementCard";
import achievements from "../../data/achievements";

function AchievementsSection() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow="Achievements" title="Our Recognitions" centered />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export default AchievementsSection;
