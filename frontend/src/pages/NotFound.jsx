import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-bg-light px-4">
      <div className="text-center">
        <p className="text-7xl font-bold text-navy">404</p>
        <h1 className="mt-4 font-serif text-3xl font-bold text-navy">Page Not Found</h1>
        <p className="mt-3 text-gray-600">The page you are looking for doesn't exist.</p>
        <Link
          to="/"
          className="mt-7 inline-block rounded-md bg-navy px-6 py-3 font-semibold text-white"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
