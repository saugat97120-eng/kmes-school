import { Eye } from "lucide-react";
import { handleImageError } from "../../utils/format";

export default function GalleryCard({ image, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-hidden"
    >
      <img
        src={image.src}
        alt={image.title || "School gallery photo"}
        loading="lazy"
        decoding="async"
        onError={handleImageError}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Center Zoom Icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-navy backdrop-blur-md shadow-md">
          <Eye size={20} className="text-navy" />
        </div>
      </div>

      {/* Bottom Caption Pill */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-left text-white opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
        <span className="inline-block rounded-md bg-gold/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">
          {image.category || "Moments"}
        </span>
        <h4 className="mt-1 text-xs font-bold text-white line-clamp-1">
          {image.title}
        </h4>
      </div>
    </button>
  );
}
