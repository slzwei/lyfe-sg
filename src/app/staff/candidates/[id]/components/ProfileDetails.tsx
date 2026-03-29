"use client";

import type { CandidateProfile } from "../../actions";

export default function ProfileDetails({ profile }: { profile: CandidateProfile }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-5 py-3">
        <h3 className="font-semibold text-stone-700">Profile Details</h3>
      </div>
      <div className="p-5">
        {/* Personal info */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[
            ["Salary", profile.expected_salary ? `$${profile.expected_salary}/${profile.salary_period || "month"}` : null],
            ["Available", profile.date_available ? new Date(profile.date_available).toLocaleDateString() : null],
            ["DOB", profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : null],
            ["Nationality", profile.nationality],
            ["Race", profile.race],
            ["Gender", profile.gender],
            ["Marital Status", profile.marital_status],
            ["Place of Birth", profile.place_of_birth],
          ].map(([label, value]) => value ? (
            <div key={label as string}>
              <div className="text-xs text-stone-400">{label}</div>
              <div className="mt-0.5 text-sm text-stone-700">{value}</div>
            </div>
          ) : null)}
        </div>

        {/* Address */}
        {(profile.address_block || profile.address_street) && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <div className="text-xs text-stone-400">Address</div>
            <div className="mt-0.5 text-sm text-stone-700">
              {[profile.address_block, profile.address_street, profile.address_unit].filter(Boolean).join(" ")}
              {profile.address_postal && `, S(${profile.address_postal})`}
            </div>
          </div>
        )}

        {/* Emergency contact */}
        {profile.emergency_name && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <div className="text-xs text-stone-400">Emergency Contact</div>
            <div className="mt-0.5 text-sm text-stone-700">
              {profile.emergency_name}
              {profile.emergency_relationship && ` (${profile.emergency_relationship})`}
              {profile.emergency_contact && ` — ${profile.emergency_contact}`}
            </div>
          </div>
        )}

        {/* Skills */}
        {(profile.software_competencies || profile.typing_wpm || profile.shorthand_wpm) && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <div className="text-xs text-stone-400">Skills</div>
            <div className="mt-0.5 space-y-1 text-sm text-stone-700">
              {profile.software_competencies && <div>{profile.software_competencies}</div>}
              {profile.typing_wpm && <div>Typing: {profile.typing_wpm} WPM</div>}
              {profile.shorthand_wpm && <div>Shorthand: {profile.shorthand_wpm} WPM</div>}
            </div>
          </div>
        )}

        {/* Languages */}
        {profile.languages && (profile.languages as unknown[]).length > 0 && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <div className="mb-1 text-xs text-stone-400">Languages</div>
            <div className="flex flex-wrap gap-1.5">
              {(profile.languages as { language: string; spoken?: string; written?: string }[]).map((lang, i) => (
                <span key={i} className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600">
                  {lang.language}
                  {(lang.spoken || lang.written) && (
                    <span className="text-stone-400"> — {[lang.spoken && `Spoken: ${lang.spoken}`, lang.written && `Written: ${lang.written}`].filter(Boolean).join(", ")}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Employment history */}
        {profile.employment_history && (profile.employment_history as unknown[]).length > 0 && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <div className="mb-2 text-xs text-stone-400">Employment History</div>
            <div className="space-y-2">
              {(profile.employment_history as { company?: string; position?: string; from?: string; to?: string; reason_leaving?: string }[]).map((job, i) => (
                <div key={i} className="rounded-lg bg-stone-50 p-3 text-sm">
                  <div className="font-medium text-stone-700">{job.position || "—"}</div>
                  <div className="text-stone-500">{job.company || "—"}</div>
                  <div className="mt-0.5 text-xs text-stone-400">
                    {job.from || "?"} — {job.to || "Present"}
                    {job.reason_leaving && ` | Left: ${job.reason_leaving}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {profile.education && Object.keys(profile.education).length > 0 && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <div className="mb-2 text-xs text-stone-400">Education</div>
            <div className="space-y-2">
              {Object.entries(profile.education).map(([level, details]) => {
                const d = details as { school?: string; course?: string; year?: string } | null;
                if (!d || (!d.school && !d.course)) return null;
                return (
                  <div key={level} className="rounded-lg bg-stone-50 p-3 text-sm">
                    <div className="text-xs font-medium uppercase text-stone-400">{level.replace(/_/g, " ")}</div>
                    {d.school && <div className="text-stone-700">{d.school}</div>}
                    {d.course && <div className="text-stone-500">{d.course}</div>}
                    {d.year && <div className="text-xs text-stone-400">{d.year}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
