import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-bold text-orange-500">404</h1>
        <h2 className="mt-4 text-lg font-semibold text-stone-800">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
