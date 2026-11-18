import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import GalleryCard from "../components/cards/GalleryCard";
import GalleryLightbox from "../components/common/GalleryLightbox";
import CardSkeleton from "../components/common/CardSkeleton";
import { fetchGallery, handleFetchError } from "../utils/apiHelpers";

const categories = ["All", "Campus", "Events", "Sports", "Achievements"];

export default function Gallery() {
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState("All");
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    async function loadGallery() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchGallery();
        setGallery(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setGallery(handleFetchError(err));
      } finally {
        setLoading(false);
      }
    }
    loadGallery();
  }, []);

  const filtered =
    active === "All" ? gallery : gallery.filter((g) => g.category === active);

  return (
    <div>
      <PageHeader
        eyebrow="Campus Life Deck"
        title="School Photo & Media Gallery"
      />
      <section className="py-16 sm:py-20">
        <Container>
          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-200">
              Failed to load gallery: {error}
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActive(c);
                  setSelectedIdx(null);
                }}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  active === c
                    ? "bg-navy text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="mt-8">
              <CardSkeleton count={8} />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((img, idx) => (
                <GalleryCard
                  key={img._id || img.id || idx}
                  image={img}
                  onClick={() => setSelectedIdx(idx)}
                />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* Lightbox Modal */}
      {selectedIdx !== null && (
        <GalleryLightbox
          images={filtered}
          currentIndex={selectedIdx}
          onClose={() => setSelectedIdx(null)}
          onPrev={() =>
            setSelectedIdx((prev) =>
              prev === 0 ? filtered.length - 1 : prev - 1
            )
          }
          onNext={() =>
            setSelectedIdx((prev) =>
              prev === filtered.length - 1 ? 0 : prev + 1
            )
          }
        />
      )}
    </div>
  );
}
