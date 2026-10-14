import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import GalleryCard from "../components/cards/GalleryCard";
import CardSkeleton from "../components/common/CardSkeleton";
import { X } from "lucide-react";
import { fetchGallery, handleFetchError } from "../utils/apiHelpers";

const categories = ["All", "Campus", "Events", "Sports", "Achievements"];

function Gallery() {
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState("All");
  const [selected, setSelected] = useState(null);

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
      <PageHeader eyebrow="Gallery" title="School Gallery" />
      <section className="py-20">
        <Container>
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
              Failed to load gallery: {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active === c
                    ? "bg-navy text-white"
                    : "bg-gray-100 text-navy hover:bg-gray-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="mt-10">
              <CardSkeleton count={8} />
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((img) => (
                <GalleryCard key={img._id || img.id} image={img} onClick={() => setSelected(img)} />
              ))}
            </div>
          )}
        </Container>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute right-6 top-6 text-white"
            onClick={() => setSelected(null)}
            aria-label="Close"
          >
            <X size={28} />
          </button>
          <img
            src={selected.src}
            alt={selected.title}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default Gallery;
