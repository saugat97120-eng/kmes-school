import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import GalleryCard from "../cards/GalleryCard";
import useApiList from "../../hooks/useApiList";
import { fetchGallery } from "../../utils/apiHelpers";

const loadGallery = () => fetchGallery();

function GallerySection() {
  const { items, loading } = useApiList(loadGallery);
  if (loading || items.length === 0) return null;

  return (
    <section className="bg-bg-light py-20">
      <Container>
        <SectionHeading eyebrow="Gallery" title="Moments From Our School" centered />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.slice(0, 6).map((g) => (
            <GalleryCard key={g._id} image={g} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button to="/gallery" variant="outline" showArrow>
            View Full Gallery
          </Button>
        </div>
      </Container>
    </section>
  );
}

export default GallerySection;
