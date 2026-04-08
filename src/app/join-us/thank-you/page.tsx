import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
        <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-stone-800">Thank You!</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
        Your application has been submitted successfully. Our team will review
        your profile and reach out to you shortly.
      </p>

      <Link
        href="/join-us"
        className="mt-6 inline-block rounded-xl bg-orange-500 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
      >
        Back to Home
      </Link>
    </div>
  );
}
