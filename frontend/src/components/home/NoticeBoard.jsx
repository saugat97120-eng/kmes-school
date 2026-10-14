import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import NoticeCard from "../cards/NoticeCard";
import EmptyState from "../common/EmptyState";
import useApiList from "../../hooks/useApiList";
import { fetchNotices } from "../../utils/apiHelpers";

const loadNotices = () => fetchNotices();

function NoticeBoard() {
  const { items, loading, error } = useApiList(loadNotices);
  // Pinned notices first, then newest first (the API already sorts newest first).
  const notices = [...items].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))).slice(0, 3);

  return (
    <section className="bg-bg-light py-20">
      <Container>
        <SectionHeading eyebrow="Notice Board" title="Latest Notices" centered />
        <div className="mt-12">
          {loading ? (
            <p className="text-center text-sm text-gray-500">Loading notices...</p>
          ) : notices.length === 0 ? (
            <EmptyState
              title={error ? "Notices could not be loaded" : "No notices available"}
              description={error ? "Please try again in a moment." : "School notices will appear here when published."}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {notices.map((n) => (
                <NoticeCard key={n._id} notice={n} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-10 text-center">
          <Button to="/notices" variant="outline" showArrow>
            View All Notices
          </Button>
        </div>
      </Container>
    </section>
  );
}

export default NoticeBoard;
