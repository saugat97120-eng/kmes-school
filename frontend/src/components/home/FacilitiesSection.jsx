import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import FacilityCard from "../cards/FacilityCard";
import useApiList from "../../hooks/useApiList";
import { fetchFacilities } from "../../utils/apiHelpers";

const loadFacilities = () => fetchFacilities();

export default function FacilitiesSection() {
  const { items, loading } = useApiList(loadFacilities);
  if (loading || items.length === 0) return null;

  return (
    <section className="bg-slate-50/60 py-20 border-t border-slate-100">
      <Container>
        <SectionHeading
          eyebrow="Campus Infrastructure Deck"
          title="Modern Learning Facilities"
          description="Designed to support interactive scientific experimentations, multimedia computer skills, and healthy physical recreation."
          centered
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 3).map((f) => (
            <FacilityCard key={f._id || f.id} facility={f} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button to="/facilities" variant="outline" showArrow>
            Explore All Campus Facilities
          </Button>
        </div>
      </Container>
    </section>
  );
}
