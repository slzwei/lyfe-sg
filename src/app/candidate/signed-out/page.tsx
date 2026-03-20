export default function SignedOutPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
        <svg
          className="h-8 w-8 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-stone-800">
        You have been signed out
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Thank you for using the Lyfe Candidate Portal. You may close this window.
      </p>
    </div>
  );
}
