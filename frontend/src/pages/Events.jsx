import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import EventCard from "../components/cards/EventCard";
import EmptyState from "../components/common/EmptyState";
import { fetchEvents, handleFetchError } from "../utils/apiHelpers";

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setEvents(handleFetchError(err));
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Events" title="School Events" />
      <section className="py-20">
        <Container>
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
              Failed to load events: {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-navy"></div>
            </div>
          ) : events.length === 0 ? (
            <EmptyState title="No events available" description="Upcoming events will appear here." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e._id || e.id} event={e} />
              ))}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}

export default Events;
