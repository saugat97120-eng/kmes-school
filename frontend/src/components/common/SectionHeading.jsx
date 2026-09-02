function SectionHeading({ eyebrow, title, description, centered = false }) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 font-serif text-3xl font-bold text-navy sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 leading-7 text-gray-600">{description}</p>
      )}
    </div>
  );
}

export default SectionHeading;
