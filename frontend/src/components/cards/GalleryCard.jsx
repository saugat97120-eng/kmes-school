function GalleryCard({ image, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100"
    >
      <img
        src={image.src}
        alt={image.title}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
      <div className="absolute bottom-0 left-0 right-0 translate-y-2 p-5 text-left text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold">
          {image.category}
        </p>
        <h3 className="mt-1 font-serif text-lg font-bold">{image.title}</h3>
      </div>
    </button>
  );
}

export default GalleryCard;
