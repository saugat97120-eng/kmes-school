// Renders a small colored pill for a content workflow status.
// Pure presentational helper shared by the admin content tables + review queue.
const STATUS_META = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  pending_review: { label: "Pending Review", className: "bg-amber-50 text-amber-700" },
  approved: { label: "Approved", className: "bg-blue-50 text-blue-700" },
  published: { label: "Published", className: "bg-green-50 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700" },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}