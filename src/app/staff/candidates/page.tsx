import CandidatesClient from "./CandidatesClient";

export default function CandidatesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-800">Candidates</h1>
      <CandidatesClient />
    </div>
  );
}
