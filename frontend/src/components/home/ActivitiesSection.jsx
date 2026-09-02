import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import activities from "../../data/activities";

function ActivitiesSection() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow="Activities" title="Beyond the Classroom" centered />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((a) => (
            <div key={a.id} className="rounded-2xl border border-gray-200 p-6">
              <h3 className="font-serif text-lg font-bold text-navy">{a.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{a.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default ActivitiesSection;
