function FacilityCard({ facility }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={facility.image}
          alt={facility.title}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-6">
        <h3 className="font-serif text-xl font-bold text-navy">{facility.title}</h3>
        <p className="mt-3 text-sm leading-6 text-gray-600">{facility.description}</p>
      </div>
    </article>
  );
}

export default FacilityCard;
