import JobsClient from "./JobsClient";

export default function JobsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-800">Jobs</h1>
      <JobsClient />
    </div>
  );
}
