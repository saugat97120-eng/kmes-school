import { Inbox } from "lucide-react";

function EmptyState({
  title = "No content available",
  description = "There is currently nothing to display here.",
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-gold shadow-sm">
        <Inbox size={26} />
      </div>
      <h3 className="mt-5 font-serif text-xl font-bold text-navy">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default EmptyState;
