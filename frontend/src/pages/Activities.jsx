import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import { fetchActivities, handleFetchError } from "../utils/apiHelpers";

function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadActivities() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchActivities();
        setActivities(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setActivities(handleFetchError(err));
      } finally {
        setLoading(false);
      }
    }
    loadActivities();
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Activities" title="Student Activities" />
      <section className="py-20">
        <Container>
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
              Failed to load activities: {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-navy"></div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activities.map((a) => (
                <div key={a._id || a.id} className="rounded-2xl border border-gray-200 p-7">
                  <h3 className="font-serif text-lg font-bold text-navy">{a.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{a.description}</p>
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}

export default Activities;
