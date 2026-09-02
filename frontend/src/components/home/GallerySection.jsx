import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import GalleryCard from "../cards/GalleryCard";
import gallery from "../../data/gallery";

function GallerySection() {
  return (
    <section className="bg-bg-light py-20">
      <Container>
        <SectionHeading eyebrow="Gallery" title="Moments From Our School" centered />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {gallery.map((g) => (
            <GalleryCard key={g.id} image={g} />
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
