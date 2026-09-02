import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import AchievementCard from "../components/cards/AchievementCard";
import EmptyState from "../components/common/EmptyState";
import { fetchAchievements, handleFetchError } from "../utils/apiHelpers";

const categories = ["All", "Academic", "Sports", "Student", "School"];

function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState("All");

  useEffect(() => {
    async function loadAchievements() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAchievements();
        setAchievements(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setAchievements(handleFetchError(err));
      } finally {
        setLoading(false);
      }
    }
    loadAchievements();
  }, []);

  const filtered =
    active === "All"
      ? achievements
      : achievements.filter((a) => a.category === active);

  return (
    <div>
      <PageHeader eyebrow="Achievements" title="Our Achievements" />
      <section className="py-20">
        <Container>
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
              Failed to load achievements: {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active === c
                    ? "bg-navy text-white"
                    : "bg-gray-100 text-navy hover:bg-gray-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-navy"></div>
            </div>
          ) : (
            <div className="mt-10">
              {filtered.length === 0 ? (
                <EmptyState title="No achievements found" description="Check back later for updates." />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((a) => (
                    <AchievementCard key={a._id || a.id} achievement={a} />
                  ))}
                </div>
              )}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}

export default Achievements;
