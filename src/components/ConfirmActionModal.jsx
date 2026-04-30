// src/components/ConfirmActionModal.jsx
// Lightweight "does this look right?" review modal for saves/records.
import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Props:
 *   title      — modal heading string
 *   rows       — array of { label, value, highlight? } to display in the summary
 *   onConfirm  — called when user taps Confirm
 *   onCancel   — called when user dismisses
 *   confirmLabel — button text (default "Looks good — save")
 *   confirmClass — tailwind classes for confirm button (default green)
 *   warning    — optional string shown as an amber warning banner
 */
export default function ConfirmActionModal({
  title,
  rows = [],
  onConfirm,
  onCancel,
  confirmLabel = "Looks good — save",
  confirmClass = "bg-green-600 hover:bg-green-700",
  warning,
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-green-600 shrink-0" />
            <p className="font-extrabold text-slate-800 text-base">{title}</p>
          </div>
          <button onClick={onCancel}
            className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Summary rows */}
          <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between items-center px-3 py-2.5 gap-3">
                <span className="text-xs font-semibold text-slate-500 shrink-0">{row.label}</span>
                <span className={`text-sm font-bold text-right ${row.highlight ? "text-blue-700" : "text-slate-800"}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Optional warning */}
          {warning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-amber-800">
              ⚠️ {warning}
            </div>
          )}

          <p className="text-xs text-slate-400 text-center">Please check the details above before confirming.</p>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onConfirm}
              className={`flex-1 flex items-center justify-center gap-2 text-white font-bold py-2.5 rounded-xl text-sm transition-colors ${confirmClass}`}
            >
              <CheckCircle2 size={15} /> {confirmLabel}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
