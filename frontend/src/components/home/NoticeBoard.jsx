import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import NoticeCard from "../cards/NoticeCard";
import EmptyState from "../common/EmptyState";
import CardSkeleton from "../common/CardSkeleton";
import useApiList from "../../hooks/useApiList";
import { fetchNotices } from "../../utils/apiHelpers";

const loadNotices = () => fetchNotices();

export default function NoticeBoard() {
  const { items, loading, error } = useApiList(loadNotices);
  // Pinned notices first, then newest first (the API already sorts newest first).
  const notices = [...items]
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    .slice(0, 3);

  return (
    <section className="bg-slate-50/60 py-20 border-t border-slate-100">
      <Container>
        <SectionHeading
          eyebrow="Notice Circulars Deck"
          title="Official School Announcements"
          description="Real-time administrative notices, examination routines, holiday calendars, and academic circulars."
          centered
        />
        <div className="mt-12">
          {loading ? (
            <CardSkeleton count={3} type="notice" />
          ) : notices.length === 0 ? (
            <EmptyState
              title={error ? "Notices could not be loaded" : "No notices available"}
              description={
                error
                  ? "Please try again in a moment."
                  : "Official school notices will appear here as soon as they are published by administration."
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {notices.map((n) => (
                <NoticeCard key={n._id || n.id} notice={n} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-10 text-center">
          <Button to="/notices" variant="outline" showArrow>
            View All Circulars & Archives
          </Button>
        </div>
      </Container>
    </section>
  );
}
