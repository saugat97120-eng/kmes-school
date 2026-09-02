import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import NoticeCard from "../cards/NoticeCard";
import EmptyState from "../common/EmptyState";
import notices from "../../data/notices";

function NoticeBoard() {
  return (
    <section className="bg-bg-light py-20">
      <Container>
        <SectionHeading eyebrow="Notice Board" title="Latest Notices" centered />
        <div className="mt-12">
          {notices.length === 0 ? (
            <EmptyState
              title="No notices available"
              description="School notices will appear here when published."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {notices.map((n) => (
                <NoticeCard key={n.id} notice={n} />
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
