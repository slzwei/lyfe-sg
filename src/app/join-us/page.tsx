import JoinUsForm from "./JoinUsForm";

export default function JoinUsPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-stone-800 sm:text-3xl">
          Join Our Team
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Start your application in under a minute. You&apos;ll then complete a
          short personality quiz.
        </p>
      </div>

      <JoinUsForm />
    </div>
  );
}
