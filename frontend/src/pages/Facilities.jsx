import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import FacilityCard from "../components/cards/FacilityCard";
import CardSkeleton from "../components/common/CardSkeleton";
import { fetchFacilities, handleFetchError } from "../utils/apiHelpers";

function Facilities() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadFacilities() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchFacilities();
        setFacilities(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setFacilities(handleFetchError(err));
      } finally {
        setLoading(false);
      }
    }
    loadFacilities();
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Facilities" title="Campus & Facilities" />
      <section className="py-20">
        <Container>
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
              Failed to load facilities: {error}
            </div>
          )}

          {loading ? (
            <CardSkeleton count={6} />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {facilities.map((f) => (
                  <FacilityCard key={f._id || f.id} facility={f} />
                ))}
              </div>
              <p className="mt-10 text-sm text-gray-500">
                Facility details are updated as they are confirmed by the school
                administration.
              </p>
            </>
          )}
        </Container>
      </section>
    </div>
  );
}

export default Facilities;
