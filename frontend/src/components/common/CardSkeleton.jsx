function CardSkeleton({ count = 3, type = "card" }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === "notice") {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-4">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
        >
          <div className="h-48 w-full animate-pulse bg-gray-200" />
          <div className="p-6">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-5 w-4/5 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CardSkeleton;
