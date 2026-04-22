// src/components/StudentProfile.jsx
import { useState, useEffect } from "react";
import { X, Phone, MapPin, Calendar, CreditCard, TrendingUp, GraduationCap, Pencil } from "lucide-react";
import { getAttendanceForStudent, getPayments, updateStudent, parseFirebaseError } from "../firestoreService";
import { LOCATION_SCHEDULE } from "../scheduleConfig";
import ProgressNotes from "./ProgressNotes";
import toast from "react-hot-toast";

const currentMonth = () => new Date().toISOString().slice(0, 7);
const fmtDate   = (ts) => !ts?.seconds ? "—" : new Date(ts.seconds * 1000).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
const fmtJoined = (ts) => !ts?.seconds ? "—" : new Date(ts.seconds * 1000).toLocaleDateString("en-LK", { month: "long", year: "numeric" });

const PAY_TYPE_LABELS = {
  monthly:     { label: "Monthly",     color: "bg-green-100 text-green-700",   badge: "📅" },
  term:        { label: "Term Fee",    color: "bg-indigo-100 text-indigo-700", badge: "🗓️" },
  annual:      { label: "Term Fee",    color: "bg-indigo-100 text-indigo-700", badge: "🗓️" },
  scholarship: { label: "Scholarship", color: "bg-purple-100 text-purple-700", badge: "🎓" },
};

function PayTypeBadge({ type }) {
  const cfg = PAY_TYPE_LABELS[type] || PAY_TYPE_LABELS.monthly;
  return <span className={`badge ${cfg.color}`}>{cfg.badge} {cfg.label}</span>;
}

const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "progress", label: "Progress" },
  { id: "payments", label: "Payments" },
];

export default function StudentProfile({ student, onClose, onUpdated }) {
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(false);
  const [editName, setEditName]     = useState(student.name);
  const [editPhone, setEditPhone]   = useState(student.phone || "");
  const [saving, setSaving]         = useState(false);
  const [activeTab, setActiveTab]   = useState("overview");
  const [noteMonth, setNoteMonth]   = useState(currentMonth());

  useEffect(() => {
    Promise.all([getAttendanceForStudent(student.id), getPayments()])
      .then(([att, pay]) => {
        setAttendance(att);
        setPayments(pay.filter((p) => p.studentId === student.id).sort((a, b) => (b.paidAt?.seconds || 0) - (a.paidAt?.seconds || 0)));
      })
      .finally(() => setLoading(false));
  }, [student.id]);

  const handleSave = async () => {
    if (!editName.trim()) { toast.error("Name cannot be empty."); return; }
    setSaving(true);
    try {
      await updateStudent(student.id, { name: editName.trim(), phone: editPhone.trim() });
      toast.success("Profile updated!");
      setEditing(false);
      onUpdated();
    } catch (err) { toast.error(parseFirebaseError(err, "Could not update.")); }
    finally { setSaving(false); }
  };

  const presentCount = attendance.filter((r) => r.status === "present").length;
  const absentCount  = attendance.filter((r) => r.status === "absent").length;
  const totalMarked  = presentCount + absentCount;
  const attendRate   = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;
  const schedule     = LOCATION_SCHEDULE[student.location];
  const totalPaid    = payments.reduce((s, p) => s + Number(p.amount), 0);
  const isScholarship = payments.some((p) => p.paymentType === "scholarship");

  const rateColor = attendRate >= 75 ? "#22c55e" : attendRate >= 50 ? "#f59e0b" : "#ef4444";
  const rateText  = attendRate >= 75 ? "text-green-600" : attendRate >= 50 ? "text-amber-500" : "text-red-500";

  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  }).reverse();

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[94vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sm:rounded-t-2xl rounded-t-2xl px-4 sm:px-6 py-4 text-white shrink-0"
          style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl font-extrabold shadow-lg shrink-0">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                {editing ? (
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="text-base font-extrabold bg-white/20 rounded-xl px-3 py-1 text-white focus:outline-none w-full"
                    autoFocus />
                ) : (
                  <h2 className="text-base font-extrabold truncate flex items-center gap-2">
                    {student.name}
                    {isScholarship && (
                      <span className="text-xs bg-purple-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <GraduationCap size={10} /> Scholar
                      </span>
                    )}
                  </h2>
                )}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-blue-200 text-xs"><MapPin size={10} /> {student.location}</span>
                  {schedule && <span className="flex items-center gap-1 text-blue-200 text-xs"><Calendar size={10} /> {schedule.label}</span>}
                  <span className="text-blue-200 text-xs">Joined {fmtJoined(student.createdAt)}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0">
              <X size={17} />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Phone size={12} className="text-blue-300 shrink-0" />
            {editing ? (
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Phone number"
                className="bg-white/20 rounded-xl px-3 py-1 text-white text-sm focus:outline-none" />
            ) : (
              <span className="text-blue-200 text-sm">{student.phone || "No phone number"}</span>
            )}
          </div>

          <div className="mt-2 flex gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="bg-white text-blue-700 font-bold px-3 py-1.5 rounded-xl text-xs hover:bg-blue-50 disabled:opacity-60">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => { setEditing(false); setEditName(student.name); setEditPhone(student.phone || ""); }}
                  className="bg-white/20 text-white font-semibold px-3 py-1.5 rounded-xl text-xs hover:bg-white/30">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors">
                <Pencil size={11} /> Edit Profile
              </button>
            )}
          </div>

          <div className="flex gap-1 mt-3">
            {PROFILE_TABS.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === t.id ? "bg-white text-blue-700 shadow" : "text-blue-200 hover:bg-white/20"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading profile…</div>
          ) : (
            <>
              {activeTab === "overview" && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                      <div className="text-xl font-extrabold text-blue-700">{presentCount}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Attended</div>
                    </div>
                    <div className={`rounded-xl p-3 text-center border ${attendRate >= 75 ? "bg-green-50 border-green-100" : attendRate >= 50 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
                      <div className={`text-xl font-extrabold ${rateText}`}>{attendRate}%</div>
                      <div className="text-xs text-slate-500 mt-0.5">Rate</div>
                    </div>
                    <div className={`rounded-xl p-3 text-center border ${isScholarship ? "bg-purple-50 border-purple-100" : "bg-green-50 border-green-100"}`}>
                      {isScholarship
                        ? <div className="text-xl font-extrabold text-purple-600"><GraduationCap size={20} className="mx-auto" /></div>
                        : <div className="text-xl font-extrabold text-green-700">Rs.{(totalPaid / 1000).toFixed(1)}k</div>
                      }
                      <div className="text-xs text-slate-500 mt-0.5">{isScholarship ? "Scholar" : "Total Paid"}</div>
                    </div>
                  </div>

                  {totalMarked > 0 && (
                    <div>
                      <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1"><TrendingUp size={14} /> Attendance</span>
                        <span className={rateText}>{presentCount}/{totalMarked}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.max(attendRate, 3)}%`, background: rateColor }} />
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar size={14} /> Last 6 Months
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {recentMonths.map((m) => {
                        const monthAtt = attendance.filter((r) => r.date?.startsWith(m));
                        const present  = monthAtt.filter((r) => r.status === "present").length;
                        const total    = monthAtt.length;
                        const rate     = total > 0 ? Math.round((present / total) * 100) : null;
                        const label    = new Date(m + "-01").toLocaleDateString("en-LK", { month: "short" });
                        return (
                          <div key={m} className={`rounded-xl p-2 text-center border ${
                            rate === null ? "bg-slate-50 border-slate-100"
                            : rate >= 75 ? "bg-green-100 border-green-200"
                            : rate >= 50 ? "bg-amber-100 border-amber-200"
                            : "bg-red-100 border-red-200"
                          }`}>
                            <div className="text-xs font-bold text-slate-500">{label}</div>
                            <div className={`text-sm font-extrabold mt-0.5 ${
                              rate === null ? "text-slate-300" : rate >= 75 ? "text-green-700" : rate >= 50 ? "text-amber-600" : "text-red-600"
                            }`}>{rate === null ? "—" : `${rate}%`}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "progress" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-slate-600 font-medium">Weekly progress notes for each class session.</p>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600">Month:</label>
                      <input type="month" value={noteMonth} onChange={(e) => setNoteMonth(e.target.value)}
                        className="input-field !w-auto text-xs py-1 px-2" />
                    </div>
                  </div>
                  <ProgressNotes student={student} currentMonth={noteMonth} />
                </div>
              )}

              {activeTab === "payments" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={15} className="text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-800">Payment History</h4>
                    <span className="badge bg-slate-100 text-slate-600 ml-auto">{payments.length} records</span>
                  </div>
                  {payments.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-6">No payments recorded yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <li key={p.id} className="py-3 flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <PayTypeBadge type={p.paymentType} />
                              <span className="text-sm font-semibold text-slate-700">{p.month}</span>
                            </div>
                            {p.deduction > 0 && <span className="text-xs text-amber-600">−Rs.{Number(p.deduction).toLocaleString()} deducted</span>}
                            <div className="text-xs text-slate-400">{fmtDate(p.paidAt)}</div>
                          </div>
                          <span className={`text-sm font-extrabold shrink-0 ${p.paymentType === "scholarship" ? "text-purple-600" : "text-green-700"}`}>
                            {p.paymentType === "scholarship" ? "🎓 Free" : `Rs.${Number(p.amount).toLocaleString()}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
