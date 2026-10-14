import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import NoticeCard from "../components/cards/NoticeCard";
import EmptyState from "../components/common/EmptyState";
import CardSkeleton from "../components/common/CardSkeleton";
import { Search } from "lucide-react";
import { fetchNotices, handleFetchError } from "../utils/apiHelpers";

function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function loadNotices() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchNotices();
        setNotices(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setNotices(handleFetchError(err));
      } finally {
        setLoading(false);
      }
    }
    loadNotices();
  }, []);

  const filtered = useMemo(
    () =>
      notices.filter((n) =>
        n.title.toLowerCase().includes(query.toLowerCase())
      ),
    [query, notices]
  );

  return (
    <div>
      <PageHeader eyebrow="Notice Board" title="School Notices" />
      <section className="py-20">
        <Container>
          <div className="mb-10 flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <Search size={18} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notices..."
              className="w-full text-sm outline-none"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
              Failed to load notices: {error}
            </div>
          )}

          {loading ? (
            <CardSkeleton count={6} type="notice" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No notices found"
              description="Try a different search term, or check back later."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((n) => (
                <NoticeCard key={n._id || n.id} notice={n} />
              ))}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}

export default Notices;
