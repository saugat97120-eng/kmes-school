import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import EventCard from "../cards/EventCard";
import events from "../../data/events";

function EventsSection() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow="Events" title="Upcoming Events" centered />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button to="/events" variant="outline" showArrow>
            View All Events
          </Button>
        </div>
      </Container>
    </section>
  );
}

export default EventsSection;
