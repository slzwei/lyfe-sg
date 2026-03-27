"use client";

interface ConfirmDialogProps {
  dialog: {
    message: string;
    phrase: string;
    onConfirm: () => void;
  };
  input: string;
  setInput: (value: string) => void;
  setDialog: (value: null) => void;
}

export function ConfirmDialog({ dialog, input, setInput, setDialog }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <p className="text-sm text-stone-700">{dialog.message}</p>
        <p className="mt-4 text-xs text-stone-500">
          Type <span className="font-semibold text-stone-800">{dialog.phrase}</span> to confirm:
        </p>
        <input
          autoFocus
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input === dialog.phrase) {
              setDialog(null);
              dialog.onConfirm();
            }
          }}
          placeholder={dialog.phrase}
          className="mt-2 h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDialog(null)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={input !== dialog.phrase}
            onClick={() => {
              setDialog(null);
              dialog.onConfirm();
            }}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-30"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
