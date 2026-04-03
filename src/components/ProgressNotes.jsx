// src/components/ProgressNotes.jsx
// Weekly progress notes per student per month.
// Week boundaries are derived from the scheduled class dates for that location.
// e.g. if Ja-Ela has Tuesdays on 7, 14, 21, 28 Jan → 4 weeks → 4 note slots.

import { useState, useEffect } from "react";
import { BookOpen, Save, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { saveProgressNote, getProgressForStudent } from "../firestoreService";
import { getScheduledDates } from "../scheduleConfig";

const monthLabel = (m) =>
  new Date(m + "-01").toLocaleDateString("en-LK", { month: "long", year: "numeric" });

const fmtUpdated = (ts) => {
  if (!ts?.seconds) return null;
  return new Date(ts.seconds * 1000).toLocaleDateString("en-LK", {
    day: "numeric", month: "short", year: "numeric",
  });
};

export default function ProgressNotes({ student, currentMonth }) {
  const [notes, setNotes]       = useState({});   // key: "YYYY-MM_W1" → { note, updatedAt }
  const [drafts, setDrafts]     = useState({});   // key: same → string (unsaved text)
  const [saving, setSaving]     = useState({});   // key: same → bool
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading]   = useState(true);

  // Scheduled class dates for this student's location in the selected month
  const scheduledDates = getScheduledDates(student.location, currentMonth);

  // Build week slots: each scheduled date = one week slot
  const weekSlots = scheduledDates.map((date, idx) => ({
    weekNum: idx + 1,
    date,
    label: `Week ${idx + 1} — ${new Date(date + "T00:00:00").toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "short" })}`,
    key: `${currentMonth}_W${idx + 1}`,
  }));

  useEffect(() => {
    setLoading(true);
    getProgressForStudent(student.id)
      .then((records) => {
        const map = {};
        records.forEach((r) => {
          map[`${r.yearMonth}_W${r.weekNum}`] = { note: r.note, updatedAt: r.updatedAt };
        });
        setNotes(map);
        // Pre-fill drafts with saved notes
        const d = {};
        records.forEach((r) => { d[`${r.yearMonth}_W${r.weekNum}`] = r.note; });
        setDrafts(d);
      })
      .finally(() => setLoading(false));
  }, [student.id, currentMonth]);

  const handleSave = async (slot) => {
    const text = (drafts[slot.key] || "").trim();
    setSaving((prev) => ({ ...prev, [slot.key]: true }));
    try {
      await saveProgressNote(student.id, student.name, student.location, currentMonth, slot.weekNum, text);
      setNotes((prev) => ({ ...prev, [slot.key]: { note: text, updatedAt: { seconds: Date.now() / 1000 } } }));
      toast.success(`Progress saved for ${student.name} — ${slot.label}`);
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving((prev) => ({ ...prev, [slot.key]: false }));
    }
  };

  const isDirty = (slot) => (drafts[slot.key] ?? "") !== (notes[slot.key]?.note ?? "");

  if (scheduledDates.length === 0) return null;

  return (
    <div className="border border-blue-100 rounded-2xl overflow-hidden">
      {/* Section header — collapsible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm sm:text-base font-bold text-blue-800">
          <BookOpen size={16} className="text-blue-600" />
          Progress Notes &mdash; {monthLabel(currentMonth)}
        </span>
        <span className="flex items-center gap-1 text-xs text-blue-500 font-semibold">
          {weekSlots.length} week{weekSlots.length !== 1 ? "s" : ""}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div className="divide-y divide-blue-50">
          {loading ? (
            <div className="px-4 py-6 text-center text-blue-400 text-sm">Loading notes&hellip;</div>
          ) : (
            weekSlots.map((slot) => {
              const saved     = notes[slot.key];
              const dirty     = isDirty(slot);
              const isPast    = slot.date <= new Date().toISOString().split("T")[0];

              return (
                <div key={slot.key} className={`px-4 py-3 ${!isPast ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className="text-xs sm:text-sm font-bold text-blue-700 flex items-center gap-1">
                      <Pencil size={12} /> {slot.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {saved?.updatedAt && (
                        <span className="text-xs text-slate-400">
                          Saved {fmtUpdated(saved.updatedAt)}
                        </span>
                      )}
                      {!saved?.note && !drafts[slot.key] && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">No note yet</span>
                      )}
                      {saved?.note && !dirty && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Saved ✓</span>
                      )}
                      {dirty && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Unsaved</span>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={drafts[slot.key] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [slot.key]: e.target.value }))}
                    placeholder={isPast ? "Write progress notes for this class…" : "Class not yet held"}
                    disabled={!isPast}
                    rows={3}
                    className="w-full border-2 border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none disabled:bg-slate-50 disabled:text-slate-400"
                  />

                  {isPast && dirty && (
                    <button
                      onClick={() => handleSave(slot)}
                      disabled={saving[slot.key]}
                      className="mt-2 flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                      <Save size={13} />
                      {saving[slot.key] ? "Saving…" : "Save Note"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
