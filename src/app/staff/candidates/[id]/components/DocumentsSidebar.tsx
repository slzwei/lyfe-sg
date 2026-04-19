"use client";

import type { CandidateDetail, CandidateDocument } from "../../actions";
import type { UseDocumentUploadReturn } from "../hooks/useDocumentUpload";

const DOCUMENT_LABELS = ["Resume", "RES5", "M5", "M9", "M9A", "HI", "M8", "M8A", "ComGI", "BCP", "PGI", "Other"];

export default function DocumentsSidebar({
  candidate,
  documents,
  uploadHook,
  onDownloadPdf,
  onDownloadDoc,
}: {
  candidate: CandidateDetail;
  documents: CandidateDocument[];
  uploadHook: UseDocumentUploadReturn;
  onDownloadPdf: (path: string) => void;
  onDownloadDoc: (fileUrl: string) => void;
}) {
  const {
    showUpload,
    setShowUpload,
    uploadLabel,
    setUploadLabel,
    setUploadFile,
    uploading,
    uploadError,
    uploadFile,
    deletingDocId,
    handleUploadDoc,
    handleDeleteDoc,
  } = uploadHook;

  return (
    <div className="min-w-0 space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="font-semibold text-stone-700">Documents</h3>
          <button
            type="button"
            onClick={() => setShowUpload(!showUpload)}
            className="rounded-lg bg-orange-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-orange-600"
          >
            {showUpload ? "Cancel" : "Upload"}
          </button>
        </div>
        {/* Upload form */}
        {showUpload && (
          <form onSubmit={handleUploadDoc} className="border-b border-stone-100 px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Document Type</label>
              <select
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-base text-stone-700 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                {DOCUMENT_LABELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">File</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-stone-700 hover:file:bg-stone-200"
              />
              <p className="mt-1 text-[10px] text-stone-400">PDF, JPEG, PNG, or Word. Max 10 MB.</p>
            </div>
            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </form>
        )}
        {/* Generated PDFs */}
        {(candidate.profile_pdf_path || candidate.enneagram_pdf_path || candidate.disc_pdf_path) && (
          <div className="divide-y divide-stone-50 border-b border-stone-100">
            {candidate.profile_pdf_path && (
              <button
                type="button"
                onClick={() => onDownloadPdf(candidate.profile_pdf_path!)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-stone-50"
              >
                <div>
                  <div className="text-sm font-medium text-stone-700">Registration Form</div>
                  <div className="text-xs text-stone-400">Application PDF</div>
                </div>
                <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
            {candidate.enneagram_pdf_path && (
              <button
                type="button"
                onClick={() => onDownloadPdf(candidate.enneagram_pdf_path!)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-stone-50"
              >
                <div>
                  <div className="text-sm font-medium text-stone-700">Enneagram Profile</div>
                  <div className="text-xs text-stone-400">
                    Personality assessment PDF{candidate.enneagram_type ? ` · ${candidate.enneagram_type}` : ""}
                  </div>
                </div>
                <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
            {candidate.disc_pdf_path && (
              <button
                type="button"
                onClick={() => onDownloadPdf(candidate.disc_pdf_path!)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-stone-50"
              >
                <div>
                  <div className="text-sm font-medium text-stone-700">DISC Profile</div>
                  <div className="text-xs text-stone-400">Legacy personality PDF</div>
                </div>
                <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
          </div>
        )}
        {/* Uploaded documents */}
        {documents.length === 0 && !candidate.profile_pdf_path && !candidate.enneagram_pdf_path && !candidate.disc_pdf_path ? (
          <div className="px-5 py-8 text-center text-sm text-stone-400">No documents.</div>
        ) : documents.length > 0 ? (
          <div className="divide-y divide-stone-50">
            {documents.map((d) => (
              <div
                key={d.id}
                className="flex w-full items-center justify-between px-5 py-3 transition-colors hover:bg-stone-50"
              >
                <button
                  type="button"
                  onClick={() => onDownloadDoc(d.file_url)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-sm font-medium text-stone-700">{d.label}</div>
                  <div className="truncate text-xs text-stone-400">{d.file_name}</div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDownloadDoc(d.file_url)}
                    className="p-1 text-stone-400 hover:text-stone-600"
                    title="Download"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(d.id)}
                    disabled={deletingDocId === d.id}
                    className="p-1 text-stone-400 hover:text-red-500 disabled:opacity-50"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Candidate notes */}
      {candidate.notes && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="mb-2 text-xs font-medium text-stone-400">Notes</h3>
          <p className="text-sm text-stone-600 whitespace-pre-wrap">{candidate.notes}</p>
        </div>
      )}
    </div>
  );
}
