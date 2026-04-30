// src/components/AttendanceTracker.jsx
import { useState, useEffect, useCallback } from "react";
import { CalendarCheck, CheckCheck, ChevronLeft, CheckCircle2, UserCheck, UserX, Users } from "lucide-react";
import toast from "react-hot-toast";
import { setAttendance, getAttendanceForDate, parseFirebaseError } from "../firestoreService";
import { LOCATION_SCHEDULE, LOCATION_CLASS_GROUPS, getScheduledDates } from "../scheduleConfig";

const todayStr     = () => new Date().toISOString().split("T")[0];
const fmtFull      = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtShort     = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-LK", { weekday: "short", day: "numeric", month: "short" });
const currentMonth = () => new Date().toISOString().slice(0, 7);

function DatePickerStep({ activeLocation, onConfirm }) {
  const [date, setDate]         = useState(todayStr());
  const [month, setMonth]       = useState(currentMonth());
  const [classGroup, setClassGroup] = useState("");
  const schedule                = LOCATION_SCHEDULE[activeLocation];
  const scheduledDates          = getScheduledDates(activeLocation, month);
  const isClassDay              = scheduledDates.includes(date);
  const today                   = todayStr();
  const classGroups             = LOCATION_CLASS_GROUPS[activeLocation] || [];

  // Reset class group when location changes
  useEffect(() => { setClassGroup(""); }, [activeLocation]);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-5 py-5 text-white" style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <CalendarCheck size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold">Mark Attendance</h2>
            <p className="text-blue-200 text-xs mt-0.5">{activeLocation}{schedule ? ` · ${schedule.label}` : ""}</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-blue-800 text-sm font-semibold">Select the date you are marking attendance for.</p>
          <p className="text-blue-500 text-xs mt-0.5">Tap a scheduled date below, or pick manually.</p>
        </div>

        {/* Class Group selector */}
        {classGroups.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Class Group</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setClassGroup("")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  classGroup === ""
                    ? "bg-blue-700 border-blue-700 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
                }`}>
                All Classes
              </button>
              {classGroups.map((g) => (
                <button key={g.id} type="button" onClick={() => setClassGroup(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                    classGroup === g.id
                      ? "bg-violet-700 border-violet-700 text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:border-violet-400"
                  }`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Show month:</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="input-field !w-auto text-sm py-1.5 px-3" />
        </div>

        {schedule && scheduledDates.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              Scheduled {schedule.label} in {new Date(month + "-01").toLocaleDateString("en-LK", { month: "long", year: "numeric" })}:
            </p>
            <div className="flex flex-wrap gap-2">
              {scheduledDates.map((d) => {
                const isPast     = d <= today;
                const isSelected = d === date;
                return (
                  <button key={d} onClick={() => setDate(d)}
                    disabled={!isPast && d !== today}
                    className={`btn-inline-sm px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      isSelected
                        ? "bg-blue-700 border-blue-700 text-white shadow-md"
                        : isPast
                          ? "bg-white border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50"
                          : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                    }`}>
                    {fmtShort(d)}
                    {d === today && <span className="ml-1.5 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">Today</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Or pick manually:</label>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)}
            className="input-field !w-auto" />
        </div>

        <div className={`rounded-xl px-4 py-3 border-2 ${isClassDay ? "bg-green-50 border-green-300" : "bg-amber-50 border-amber-300"}`}>
          <div className="text-base font-extrabold text-slate-900">{fmtFull(date)}</div>
          {schedule && (
            <div className={`text-sm font-semibold mt-0.5 ${isClassDay ? "text-green-700" : "text-amber-700"}`}>
              {isClassDay ? `✓ Scheduled ${schedule.label.slice(0, -1)} class` : `Not a scheduled class day — ${schedule.label} only`}
            </div>
          )}
        </div>

        <button onClick={() => onConfirm(date, classGroup)}
          className="btn-primary w-full justify-center py-3.5 text-base">
          <CheckCircle2 size={20} />
          {classGroup
            ? `Mark attendance — ${classGroups.find((g) => g.id === classGroup)?.label ?? classGroup}`
            : "Mark attendance for all classes"}
        </button>
      </div>
    </div>
  );
}

function MarkingStep({ date, classGroup, activeLocation, students, onBack }) {
  const [record, setRecord]   = useState({});
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [done, setDone]       = useState(false);

  const allLocationStudents = students.filter((s) => s.location === activeLocation);
  const locationStudents = classGroup
    ? allLocationStudents.filter((s) => s.classGroup === classGroup)
    : allLocationStudents;

  const classGroups    = LOCATION_CLASS_GROUPS[activeLocation] || [];
  const classGroupLabel = classGroup
    ? (classGroups.find((g) => g.id === classGroup)?.label ?? "Unknown Group")
    : "All Classes";

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
    // Only count unmarked students in the current group as blocking
    const unmarkedCount = locationStudents.filter((s) => !record[s.id]).length;
    if (unmarkedCount > 0) {
      toast(`${unmarkedCount} student${unmarkedCount > 1 ? "s are" : " is"} still unmarked.`, { duration: 5000, icon: "⚠️" });
      return;
    }
    setDone(true);
    toast.success(`Attendance saved for ${fmtShort(date)}${classGroup ? ` · ${classGroupLabel}` : ""}!`);
  };

  const presentCount  = locationStudents.filter((s) => record[s.id] === "present").length;
  const absentCount   = locationStudents.filter((s) => record[s.id] === "absent").length;
  const unmarkedCount = locationStudents.length - presentCount - absentCount;
  const progress      = locationStudents.length > 0
    ? Math.round(((presentCount + absentCount) / locationStudents.length) * 100) : 0;

  if (done) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg,#15803d,#16a34a)" }}>
          <CheckCircle2 size={38} className="text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-green-700 mb-2">All Done!</h2>
        <p className="text-slate-700 font-semibold mb-1">{fmtFull(date)}</p>
        <p className="text-slate-500 text-sm mb-6">{presentCount} Present · {absentCount} Absent</p>
        <button onClick={onBack} className="btn-primary mx-auto">
          <CalendarCheck size={16} /> Mark Another Date
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-4 text-white" style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="w-11 h-11 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold truncate">{fmtFull(date)}</h2>
            <p className="text-blue-200 text-xs">{activeLocation}{classGroupLabel ? ` · ${classGroupLabel}` : ""} · {locationStudents.length} students</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-blue-200 mb-1.5">
            <span>{presentCount + absentCount} of {locationStudents.length} marked</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge bg-green-100 text-green-800">{presentCount} Present</span>
          <span className="badge bg-red-100 text-red-800">{absentCount} Absent</span>
          {unmarkedCount > 0 && <span className="badge bg-slate-100 text-slate-600">{unmarkedCount} left</span>}
          <button onClick={markAllPresent} disabled={marking || unmarkedCount === 0}
            className="btn-success ml-auto text-xs py-1.5 px-3">
            <CheckCheck size={14} /> {marking ? "Marking…" : "All Present"}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
        ) : (
          <ul className="space-y-2">
            {locationStudents.map((s) => {
              const status = record[s.id];
              return (
                <li key={s.id} className={`rounded-xl border-2 px-3 sm:px-4 py-3 flex items-center justify-between gap-2 transition-all ${
                  status === "present" ? "bg-green-50 border-green-300"
                  : status === "absent" ? "bg-red-50 border-red-300"
                  : "bg-white border-slate-200"
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0 ${
                      status === "present" ? "bg-green-500" : status === "absent" ? "bg-red-400" : "bg-slate-300"
                    }`}>
                      {status === "present" ? <UserCheck size={15} /> : status === "absent" ? <UserX size={15} /> : s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{s.name}</div>
                      <div className={`text-xs font-semibold ${
                        status === "present" ? "text-green-600" : status === "absent" ? "text-red-500" : "text-slate-400 italic"
                      }`}>
                        {status === "present" ? "Present" : status === "absent" ? "Absent" : "tap to mark"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => mark(s, "present")}
                      className={`w-11 h-11 rounded-xl border-2 font-extrabold text-base transition-all active:scale-95 flex items-center justify-center ${
                        status === "present"
                          ? "bg-green-600 border-green-600 text-white shadow-md"
                          : "bg-white border-green-300 text-green-600 hover:bg-green-50"
                      }`}>✔</button>
                    <button onClick={() => mark(s, "absent")}
                      className={`w-11 h-11 rounded-xl border-2 font-extrabold text-base transition-all active:scale-95 flex items-center justify-center ${
                        status === "absent"
                          ? "bg-red-500 border-red-500 text-white shadow-md"
                          : "bg-white border-red-200 text-red-500 hover:bg-red-50"
                      }`}>✘</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && locationStudents.length > 0 && (
          <button onClick={handleDone}
            className={`w-full py-3.5 rounded-xl font-extrabold text-base transition-all flex items-center justify-center gap-2 mt-1 ${
              unmarkedCount === 0
                ? "btn-success"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}>
            <CheckCircle2 size={20} />
            {unmarkedCount === 0 ? "Done — Save Attendance" : `${unmarkedCount} student${unmarkedCount > 1 ? "s" : ""} still unmarked`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AttendanceTracker({ students, activeLocation }) {
  const [confirmedDate, setConfirmedDate]   = useState(null);
  const [confirmedGroup, setConfirmedGroup] = useState("");
  useEffect(() => { setConfirmedDate(null); setConfirmedGroup(""); }, [activeLocation]);

  return (
    <section className="max-w-2xl mx-auto">
      {!confirmedDate
        ? <DatePickerStep activeLocation={activeLocation} onConfirm={(d, g) => { setConfirmedDate(d); setConfirmedGroup(g); }} />
        : <MarkingStep date={confirmedDate} classGroup={confirmedGroup} activeLocation={activeLocation} students={students} onBack={() => { setConfirmedDate(null); setConfirmedGroup(""); }} />
      }
    </section>
  );
}
