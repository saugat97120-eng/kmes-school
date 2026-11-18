import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";

export default function GalleryLightbox({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}) {
  const activeImage = images && currentIndex !== null ? images[currentIndex] : null;

  useEffect(() => {
    if (!activeImage) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImage, onClose, onPrev, onNext]);

  if (!activeImage) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header Bar */}
      <div
        className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-md border border-white/10 text-xs">
          <Eye size={14} className="text-gold" />
          <span>
            {currentIndex + 1} of {images.length}
          </span>
          <span className="text-white/40">•</span>
          <span className="font-semibold text-gold uppercase tracking-wider text-[11px]">
            {activeImage.category || "Campus Moment"}
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md border border-white/10"
          aria-label="Close photo preview"
        >
          <X size={20} />
        </button>
      </div>

      {/* Prev Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 backdrop-blur-md transition border border-white/10 z-10"
          aria-label="Previous photo"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Image Container */}
      <div
        className="relative max-h-[85vh] max-w-4xl flex flex-col items-center justify-center p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={activeImage.src}
          alt={activeImage.title || "School gallery photo"}
          className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
        />

        {activeImage.title && (
          <div className="mt-4 rounded-xl bg-black/60 px-4 py-2 backdrop-blur-md text-center border border-white/10 max-w-lg">
            <h4 className="text-sm font-bold text-white">{activeImage.title}</h4>
            {activeImage.description && (
              <p className="mt-0.5 text-xs text-slate-300">{activeImage.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 backdrop-blur-md transition border border-white/10 z-10"
          aria-label="Next photo"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
}
