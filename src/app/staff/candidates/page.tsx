import { getStaffUser } from "../actions";
import CandidatesClient from "./CandidatesClient";

export default async function CandidatesPage() {
  const staff = await getStaffUser();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-800">Candidates</h1>
      <CandidatesClient staffRole={staff?.role} />
    </div>
  );
}
