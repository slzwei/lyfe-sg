export default function AccountDeletionPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
          Account Deletion
        </h1>
        <p className="mt-2 text-stone-500">
          How to delete your Lyfe account and associated data
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">
            How to delete your account
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            You can delete your account directly from the Lyfe app by following
            these steps:
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-stone-600">
            <li>Open the Lyfe app and sign in.</li>
            <li>
              Go to the <strong>Profile</strong> tab.
            </li>
            <li>
              Scroll down and tap <strong>Delete Account</strong>.
            </li>
            <li>Confirm the deletion when prompted.</li>
          </ol>
        </section>

        <hr className="border-stone-100" />

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">
            What gets deleted
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            When you delete your account, the following data is permanently
            removed:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-600">
            <li>Your profile information and photo</li>
            <li>Lead records and activity history</li>
            <li>Event attendance records</li>
            <li>Exam attempts and results</li>
            <li>Training progress and module completions</li>
            <li>Notifications and push notification tokens</li>
            <li>Candidate records and related documents</li>
            <li>Your authentication account</li>
          </ul>
        </section>

        <hr className="border-stone-100" />

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">
            Data retention
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            Account deletion is permanent and cannot be undone. All associated
            data is deleted immediately upon confirmation. No data is retained
            after deletion.
          </p>
        </section>

        <hr className="border-stone-100" />

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">
            Need help?
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            If you are unable to access the app or need assistance with account
            deletion, contact us at{" "}
            <a
              href="mailto:shawnleejob@gmail.com"
              className="font-medium text-orange-500 hover:text-orange-600"
            >
              shawnleejob@gmail.com
            </a>
            {" "}with the phone number associated with your account. We will
            process your request within 7 business days.
          </p>
        </section>
      </div>
    </div>
  );
}
