import { useState } from "react";
import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import GalleryCard from "../cards/GalleryCard";
import GalleryLightbox from "../common/GalleryLightbox";
import useApiList from "../../hooks/useApiList";
import { fetchGallery } from "../../utils/apiHelpers";

const loadGallery = () => fetchGallery();

export default function GallerySection() {
  const { items, loading } = useApiList(loadGallery);
  const [selectedIdx, setSelectedIdx] = useState(null);

  if (loading || items.length === 0) return null;

  const displayImages = items.slice(0, 6);

  return (
    <section className="bg-slate-50/60 py-20 border-t border-slate-100">
      <Container>
        <SectionHeading
          eyebrow="School Media Deck"
          title="Moments From KMES Life"
          description="A glimpse into academic activities, sports competitions, science exhibitions, and annual celebrations."
          centered
        />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {displayImages.map((g, idx) => (
            <GalleryCard
              key={g._id || g.id || idx}
              image={g}
              onClick={() => setSelectedIdx(idx)}
            />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button to="/gallery" variant="outline" showArrow>
            Explore Full Gallery Deck
          </Button>
        </div>
      </Container>

      {/* Lightbox Modal */}
      {selectedIdx !== null && (
        <GalleryLightbox
          images={displayImages}
          currentIndex={selectedIdx}
          onClose={() => setSelectedIdx(null)}
          onPrev={() =>
            setSelectedIdx((prev) =>
              prev === 0 ? displayImages.length - 1 : prev - 1
            )
          }
          onNext={() =>
            setSelectedIdx((prev) =>
              prev === displayImages.length - 1 ? 0 : prev + 1
            )
          }
        />
      )}
    </section>
  );
}
