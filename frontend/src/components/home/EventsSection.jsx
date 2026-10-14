import { useState } from "react";
import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import EventCard from "../cards/EventCard";
import useApiList from "../../hooks/useApiList";
import { fetchEvents } from "../../utils/apiHelpers";

const loadEvents = () => fetchEvents();
const DAY = 24 * 60 * 60 * 1000;

function EventsSection() {
  const { items, loading } = useApiList(loadEvents);
  const [cutoff] = useState(() => Date.now() - DAY);
  if (loading || items.length === 0) return null; // nothing real to show -> no empty/demo section

  const upcoming = items
    .filter((e) => new Date(e.date).getTime() >= cutoff)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const list = (upcoming.length ? upcoming : items).slice(0, 3);

  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow="Events" title={upcoming.length ? "Upcoming Events" : "Recent Events"} centered />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <EventCard key={e._id} event={e} />
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
