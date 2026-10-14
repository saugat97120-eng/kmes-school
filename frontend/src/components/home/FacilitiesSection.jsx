import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import FacilityCard from "../cards/FacilityCard";
import useApiList from "../../hooks/useApiList";
import { fetchFacilities } from "../../utils/apiHelpers";

const loadFacilities = () => fetchFacilities();

function FacilitiesSection() {
  const { items, loading } = useApiList(loadFacilities);
  if (loading || items.length === 0) return null;

  return (
    <section className="bg-bg-light py-20">
      <Container>
        <SectionHeading eyebrow="Facilities" title="Campus & Facilities" centered />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {items.slice(0, 3).map((f) => (
            <FacilityCard key={f._id} facility={f} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button to="/facilities" variant="outline" showArrow>
            View All Facilities
          </Button>
        </div>
      </Container>
    </section>
  );
}

export default FacilitiesSection;
