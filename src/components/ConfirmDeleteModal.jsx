// src/components/ConfirmDeleteModal.jsx
// Typed-name confirmation modal for irreversible deletions.
import { useState, useEffect, useRef } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";

/**
 * Props:
 *   name        — the student's name (user must type this to confirm)
 *   onConfirm   — called when confirmed; should be async; receives no args
 *   onCancel    — called when dismissed
 *   details     — array of strings describing what will be deleted
 */
export default function ConfirmDeleteModal({ name, onConfirm, onCancel, details = [] }) {
  const [typed, setTyped]     = useState("");
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const match = typed.trim().toLowerCase() === name.trim().toLowerCase();

  const handleConfirm = async () => {
    if (!match || deleting) return;
    setDeleting(true);
    try { await onConfirm(); }
    finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Red header */}
        <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-base leading-tight">Delete Student</p>
              <p className="text-red-200 text-xs mt-0.5">This cannot be undone</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-11 h-11 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0">
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Warning */}
          <div className="flex gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">
                You are permanently deleting <span className="underline">{name}</span>
              </p>
              <p className="text-xs text-red-600 mt-1">All of the following will be erased from Firebase forever:</p>
              <ul className="mt-1.5 space-y-0.5">
                {(details.length ? details : [
                  "Student profile & contact details",
                  "All attendance records",
                  "All payment records",
                  "All progress notes",
                ]).map((d) => (
                  <li key={d} className="text-xs text-red-700 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Typed confirmation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Type <span className="font-extrabold text-red-600">{name}</span> to confirm:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              placeholder={name}
              className={`input-field border-2 transition-colors ${
                typed.length === 0 ? "border-slate-200"
                : match ? "border-green-400 bg-green-50"
                : "border-red-300 bg-red-50"
              }`}
            />
            {typed.length > 0 && !match && (
              <p className="text-xs text-red-500 mt-1 font-semibold">Name doesn't match — check spelling</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirm}
              disabled={!match || deleting}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              {deleting
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</>
                : <><Trash2 size={15} />Yes, delete forever</>
              }
            </button>
            <button
              onClick={onCancel}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
