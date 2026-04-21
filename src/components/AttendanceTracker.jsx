// src/components/AttendanceTracker.jsx
import { useState, useEffect, useCallback } from "react";
import { CalendarCheck, CheckCheck, ChevronLeft, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { setAttendance, getAttendanceForDate, parseFirebaseError } from "../firestoreService";
import { LOCATION_SCHEDULE, getScheduledDates } from "../scheduleConfig";

const todayStr     = () => new Date().toISOString().split("T")[0];
const fmtFull      = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-LK", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});
const fmtShort     = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-LK", {
  weekday: "short", day: "numeric", month: "short",
});
const currentMonth = () => new Date().toISOString().slice(0, 7);

// ── Step 1: Date Picker ───────────────────────────────────────────────────────
function DatePickerStep({ activeLocation, onConfirm }) {
  const [date, setDate]   = useState(todayStr());
  const [month, setMonth] = useState(currentMonth());
  const schedule          = LOCATION_SCHEDULE[activeLocation];
  const scheduledDates    = getScheduledDates(activeLocation, month);
  const isClassDay        = scheduledDates.includes(date);
  const today             = todayStr();

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl sm:rounded-3xl shadow-xl border border-blue-100 overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-4 sm:px-6 py-4 sm:py-5 text-white">
        <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
          <CalendarCheck size={24} /> Mark Attendance
        </h2>
        <p className="text-blue-200 text-sm mt-0.5">
          {activeLocation}{schedule ? ` · ${schedule.label}` : ""}
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <p className="text-blue-800 text-sm sm:text-base font-semibold">
            First, confirm which date you are marking attendance for.
          </p>
          <p className="text-blue-500 text-xs sm:text-sm mt-1">
            Tap a scheduled class date below, or pick any date manually.
          </p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-semibold text-blue-700">Show dates for:</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="border-2 border-blue-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-600" />
        </div>

        {/* Scheduled date quick-tap buttons */}
        {schedule && scheduledDates.length > 0 && (
          <div>
            <p className="text-sm font-bold text-blue-700 mb-2">
              Scheduled {schedule.label} in {new Date(month + "-01").toLocaleDateString("en-LK", { month: "long", year: "numeric" })}:
            </p>
            <div className="flex flex-wrap gap-2">
              {scheduledDates.map((d) => {
                const isPast     = d <= today;
                const isSelected = d === date;
                return (
                  <button key={d} onClick={() => setDate(d)}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                      isSelected
                        ? "bg-blue-700 border-blue-700 text-white shadow-md"
                        : isPast
                          ? "bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                          : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                    disabled={!isPast && d !== today}
                  >
                    {fmtShort(d)}
                    {d === today && <span className="ml-1 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">Today</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Manual date picker */}
        <div>
          <label className="block text-sm font-bold text-blue-700 mb-1.5">Or pick a date manually:</label>
          <input type="date" value={date} max={today}
            onChange={(e) => setDate(e.target.value)}
            className="border-2 border-blue-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-600 w-full sm:w-auto" />
        </div>

        {/* Selected date display */}
        <div className={`rounded-2xl px-4 py-3 border-2 ${isClassDay ? "bg-green-50 border-green-300" : "bg-amber-50 border-amber-300"}`}>
          <div className="text-base sm:text-lg font-extrabold text-blue-900">{fmtFull(date)}</div>
          {schedule && (
            <div className={`text-sm font-semibold mt-1 ${isClassDay ? "text-green-700" : "text-amber-700"}`}>
              {isClassDay
                ? `This is a scheduled ${schedule.label.slice(0, -1)} class`
                : `Not a scheduled class day — ${schedule.label} only`}
            </div>
          )}
        </div>

        {/* Confirm button */}
        <button onClick={() => onConfirm(date)}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white text-base sm:text-lg font-extrabold py-3.5 sm:py-4 rounded-2xl transition-colors shadow-lg flex items-center justify-center gap-2">
          <CheckCircle2 size={22} />
          Yes, mark attendance for this date
        </button>

      </div>
    </div>
  );
}

// ── Step 2: Marking Screen ────────────────────────────────────────────────────
function MarkingStep({ date, activeLocation, students, onBack }) {
  const [record, setRecord]   = useState({});
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [done, setDone]       = useState(false);

  const locationStudents = students.filter((s) => s.location === activeLocation);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try { setRecord(await getAttendanceForDate(date)); }
    catch (err) { toast.error(parseFirebaseError(err, "Could not load. Check your connection.")); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const mark = async (student, status) => {
    setRecord((prev) => ({ ...prev, [student.id]: status }));
    try {
      await setAttendance(student.id, date, status, student.location);
    } catch (err) {
      setRecord((prev) => ({ ...prev, [student.id]: undefined }));
      toast.error(parseFirebaseError(err, `Could not save ${student.name}. Try again.`));
    }
  };

  const markAllPresent = async () => {
    const unmarked = locationStudents.filter((s) => !record[s.id]);
    if (unmarked.length === 0) { toast("Everyone is already marked!", { icon: "ℹ️" }); return; }
    setMarking(true);
    const updates = Object.fromEntries(unmarked.map((s) => [s.id, "present"]));
    setRecord((prev) => ({ ...prev, ...updates }));
    try {
      await Promise.all(unmarked.map((s) => setAttendance(s.id, date, "present", s.location)));
      toast.success(`${unmarked.length} student${unmarked.length > 1 ? "s" : ""} marked Present!`);
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not mark all. Please try again."));
      loadAttendance();
    } finally { setMarking(false); }
  };

  const handleDone = () => {
    const unmarkedCount = locationStudents.filter((s) => !record[s.id]).length;
    if (unmarkedCount > 0) {
      toast(`${unmarkedCount} student${unmarkedCount > 1 ? "s are" : " is"} still unmarked.`, { duration: 5000, icon: "⚠️" });
      return;
    }
    setDone(true);
    toast.success("Attendance saved for " + fmtShort(date) + "!");
  };

  const presentCount  = locationStudents.filter((s) => record[s.id] === "present").length;
  const absentCount   = locationStudents.filter((s) => record[s.id] === "absent").length;
  const unmarkedCount = locationStudents.length - presentCount - absentCount;
  const progress      = locationStudents.length > 0
    ? Math.round(((presentCount + absentCount) / locationStudents.length) * 100) : 0;

  if (done) {
    return (
      <div className="bg-white/90 backdrop-blur rounded-2xl sm:rounded-3xl shadow-xl border border-green-200 p-8 sm:p-10 text-center">
        <div className="text-6xl sm:text-7xl mb-4">🎉</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-green-700 mb-2">All Done!</h2>
        <p className="text-blue-700 text-base font-semibold mb-1">{fmtFull(date)}</p>
        <p className="text-slate-500 text-sm mb-6">
          {presentCount} Present &nbsp;&middot;&nbsp; {absentCount} Absent
        </p>
        <button onClick={onBack}
          className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-3 rounded-2xl text-base transition-colors">
          Mark Another Date
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl sm:rounded-3xl shadow-xl border border-blue-100 overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-4 sm:px-6 py-4 text-white">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors shrink-0">
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold truncate">{fmtFull(date)}</h2>
            <p className="text-blue-200 text-xs">{activeLocation} &middot; {locationStudents.length} students</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-semibold text-blue-200 mb-1">
            <span>{presentCount + absentCount} of {locationStudents.length} marked</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-blue-900/50 rounded-full h-2.5">
            <div className="bg-white h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">

        {/* Summary pills + Mark All */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-green-100 text-green-800 font-bold px-3 py-1.5 rounded-full text-sm">{presentCount} Present</span>
          <span className="bg-red-100 text-red-800 font-bold px-3 py-1.5 rounded-full text-sm">{absentCount} Absent</span>
          {unmarkedCount > 0 && (
            <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-full text-sm">{unmarkedCount} left</span>
          )}
          <button onClick={markAllPresent} disabled={marking || unmarkedCount === 0}
            className="ml-auto flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-sm transition-colors">
            <CheckCheck size={15} /> {marking ? "Marking…" : "All Present"}
          </button>
        </div>

        {/* Student list */}
        {loading ? (
          <div className="text-center py-10 text-blue-400">Loading&hellip;</div>
        ) : (
          <ul className="space-y-2">
            {locationStudents.map((s) => {
              const status = record[s.id];
              return (
                <li key={s.id} className={`rounded-2xl border-2 px-3 sm:px-4 py-3 flex items-center justify-between gap-2 transition-all ${
                  status === "present" ? "bg-green-50 border-green-300"
                  : status === "absent" ? "bg-red-50 border-red-300"
                  : "bg-white border-blue-100"
                }`}>
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-bold text-blue-900 truncate">{s.name}</div>
                    {!status && <div className="text-xs text-slate-400 italic">tap to mark</div>}
                    {status === "present" && <div className="text-xs text-green-600 font-semibold">Present</div>}
                    {status === "absent"  && <div className="text-xs text-red-500 font-semibold">Absent</div>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => mark(s, "present")}
                      className={`font-extrabold px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border-2 transition-all active:scale-95 text-sm ${
                        status === "present"
                          ? "bg-green-600 border-green-600 text-white shadow-md"
                          : "bg-white border-green-400 text-green-700 hover:bg-green-50"
                      }`}>
                      ✔
                    </button>
                    <button onClick={() => mark(s, "absent")}
                      className={`font-extrabold px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border-2 transition-all active:scale-95 text-sm ${
                        status === "absent"
                          ? "bg-red-500 border-red-500 text-white shadow-md"
                          : "bg-white border-red-300 text-red-600 hover:bg-red-50"
                      }`}>
                      ✘
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Done button */}
        {!loading && locationStudents.length > 0 && (
          <button onClick={handleDone}
            className={`w-full text-base sm:text-lg font-extrabold py-3.5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 mt-1 ${
              unmarkedCount === 0
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-blue-100 text-blue-400 cursor-not-allowed"
            }`}>
            <CheckCircle2 size={22} />
            {unmarkedCount === 0 ? "Done — Save Attendance" : `${unmarkedCount} student${unmarkedCount > 1 ? "s" : ""} still unmarked`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AttendanceTracker({ students, activeLocation }) {
  const [confirmedDate, setConfirmedDate] = useState(null);
  useEffect(() => { setConfirmedDate(null); }, [activeLocation]);

  return (
    <section className="max-w-2xl mx-auto">
      {!confirmedDate
        ? <DatePickerStep activeLocation={activeLocation} onConfirm={setConfirmedDate} />
        : <MarkingStep date={confirmedDate} activeLocation={activeLocation} students={students} onBack={() => setConfirmedDate(null)} />
      }
    </section>
  );
}
