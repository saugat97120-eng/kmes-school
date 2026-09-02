function PageHeader({ eyebrow, title, description }) {
  return (
    <section className="bg-navy py-16 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-2xl leading-7 text-gray-300">{description}</p>
        )}
      </div>
    </section>
  );
}

export default PageHeader;
