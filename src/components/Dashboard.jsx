// src/components/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, TrendingUp, MapPin, Calendar, Bell, FileSpreadsheet, Users, BookOpen, Banknote, Clock, CheckCircle2 } from "lucide-react";
import { getAttendanceForMonth, getPayments } from "../firestoreService";
import { getScheduledDates, LOCATION_SCHEDULE } from "../scheduleConfig";
import MonthlyReportButton from "./MonthlyReportButton";

const currentMonth = () => new Date().toISOString().slice(0, 7);
const monthLabel   = (m) => new Date(m + "-01").toLocaleDateString("en-LK", { month: "long", year: "numeric" });

function passedScheduledDates(scheduledDates) {
  const todayStr = new Date().toISOString().split("T")[0];
  return scheduledDates.filter((d) => d <= todayStr);
}

const STAT_CARDS = [
  { key: "students",  label: "Students",     icon: Users,         gradient: "linear-gradient(135deg,#1d4ed8,#1e40af)" },
  { key: "classes",   label: "Classes Held", icon: BookOpen,      gradient: "linear-gradient(135deg,#6d28d9,#5b21b6)" },
  { key: "monthly",   label: "Monthly Fees", icon: Banknote,      gradient: "linear-gradient(135deg,#15803d,#166534)" },
  { key: "annual",    label: "Term Fees",    icon: Calendar,      gradient: "linear-gradient(135deg,#0891b2,#0e7490)" },
  { key: "pending",   label: "Pending",      icon: Clock,         gradient: "linear-gradient(135deg,#d97706,#b45309)" },
];

export default function Dashboard({ students, locations, activeLocation, onLocationChange }) {
  const [month, setMonth]           = useState(currentMonth());
  const [attendanceData, setAttendanceData] = useState([]);
  const [payments, setPayments]     = useState([]);
  const [loading, setLoading]       = useState(true);

  const locationStudents = students.filter((s) => s.location === activeLocation);
  const schedule         = LOCATION_SCHEDULE[activeLocation];
  const scheduledDates   = getScheduledDates(activeLocation, month);
  const passedDates      = passedScheduledDates(scheduledDates);
  const totalScheduled   = scheduledDates.length;
  const totalPassed      = passedDates.length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [att, pay] = await Promise.all([getAttendanceForMonth(month), getPayments()]);
      setAttendanceData(att);
      setPayments(pay);
    } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const studentStats = locationStudents.map((s) => {
    const attended = passedDates.filter((date) => {
      const rec = attendanceData.find((r) => r.studentId === s.id && r.date === date);
      return rec?.status === "present";
    }).length;
    const rate = totalPassed > 0 ? Math.round((attended / totalPassed) * 100) : 0;
    return { ...s, attended, rate };
  }).sort((a, b) => b.rate - a.rate);

  const monthPayments = payments.filter((p) => p.month === month && p.location === activeLocation);
  const paidIds       = new Set(monthPayments.map((p) => p.studentId));
  const pendingCount  = locationStudents.filter((s) => !paidIds.has(s.id)).length;
  const annualTotal   = monthPayments.filter((p) => p.paymentType === "annual" || p.paymentType === "term").reduce((s, p) => s + Number(p.amount), 0);
  const monthlyTotal  = monthPayments.filter((p) => p.paymentType === "monthly").reduce((s, p) => s + Number(p.amount), 0);

  const statValues = {
    students: locationStudents.length,
    classes:  `${totalPassed}/${totalScheduled}`,
    monthly:  `Rs.${(monthlyTotal / 1000).toFixed(1)}k`,
    annual:   `Rs.${(annualTotal / 1000).toFixed(1)}k`,
    pending:  pendingCount,
  };

  const rateColor = (r) => r >= 75 ? "#22c55e" : r >= 50 ? "#f59e0b" : "#ef4444";
  const rateLabel = (r) => r >= 75 ? "text-green-600" : r >= 50 ? "text-amber-500" : "text-red-500";

  const today        = new Date();
  const lastDay      = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isEndOfMonth = month === currentMonth() && today.getDate() >= lastDay - 2;

  return (
    <section className="space-y-5">

      {/* ── Header ── */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}>
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Dashboard</h2>
            <p className="text-slate-500 text-xs flex items-center gap-1.5 flex-wrap">
              <MapPin size={11} />
              {activeLocation} · {locationStudents.length} students
              {schedule && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {schedule.label}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">Month:</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="input-field !w-auto text-sm py-1.5 px-3" />
        </div>
      </div>

      {/* ── End-of-month banner ── */}
      {isEndOfMonth && (
        <div className="rounded-2xl p-4 sm:p-5 text-white shadow-xl"
          style={{ background: "linear-gradient(135deg,#4f46e5,#1d4ed8)" }}>
          <div className="flex items-center gap-3 mb-3">
            <Bell size={22} className="text-amber-300 animate-bounce shrink-0" />
            <div>
              <div className="font-extrabold text-base">End of month approaching!</div>
              <div className="text-blue-200 text-xs mt-0.5">Send the monthly report to keep records up to date.</div>
            </div>
          </div>
          <MonthlyReportButton month={month} students={students} locations={locations} />
        </div>
      )}

      {/* ── Report button ── */}
      {!isEndOfMonth && (
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={17} className="text-indigo-600" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Monthly Report</div>
              <div className="text-slate-500 text-xs">Download or email the report for {monthLabel(month)}</div>
            </div>
          </div>
          <MonthlyReportButton month={month} students={students} locations={locations} />
        </div>
      )}

      {/* ── Location switcher ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {locations.map((loc) => {
          const locStudents = students.filter((s) => s.location === loc);
          const locPaid     = payments.filter((p) => p.month === month && p.location === loc);
          const locTotal    = locPaid.reduce((sum, p) => sum + Number(p.amount), 0);
          const isActive    = activeLocation === loc;
          return (
            <button key={loc} onClick={() => onLocationChange(loc)}
              className="rounded-2xl p-3 sm:p-4 text-left transition-all duration-200 border-2"
              style={isActive ? {
                background: "linear-gradient(135deg,#1d4ed8,#1e40af)",
                borderColor: "#3b82f6",
                boxShadow: "0 4px 20px rgba(29,78,216,0.35)",
              } : {
                background: "rgba(255,255,255,0.88)",
                borderColor: "rgba(30,58,138,0.1)",
              }}>
              <div className={`text-xs sm:text-sm font-extrabold mb-1 flex items-center gap-1 ${isActive ? "text-white" : "text-slate-800"}`}>
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{loc}</span>
                {isActive && <CheckCircle2 size={13} className="ml-auto shrink-0 text-blue-200" />}
              </div>
              <div className={`text-xs font-medium ${isActive ? "text-blue-200" : "text-slate-500"}`}>
                {locStudents.length} students
              </div>
              <div className={`text-xs font-bold mt-1 ${isActive ? "text-green-300" : "text-green-600"}`}>
                Rs.{locTotal > 0 ? (locTotal / 1000).toFixed(1) + "k" : "0"}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Schedule banner ── */}
      {schedule && (
        <div className="glass-card rounded-2xl px-4 sm:px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-indigo-600 shrink-0" />
            <span className="font-bold text-slate-800 text-sm">
              {activeLocation} — every {schedule.label}
            </span>
            <span className="ml-auto text-xs text-slate-500">
              {totalPassed}/{totalScheduled} held
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scheduledDates.map((d) => {
              const isPast = d <= new Date().toISOString().split("T")[0];
              const dayNum = new Date(d + "T00:00:00").getDate();
              return (
                <span key={d}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all ${
                    isPast
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-400 border-slate-200"
                  }`}>
                  {dayNum}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {STAT_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="stat-card" style={{ background: c.gradient }}>
              <Icon size={18} className="text-white/70 mb-2" />
              <div className="text-xl sm:text-2xl font-extrabold leading-tight">{statValues[c.key]}</div>
              <div className="text-xs font-medium text-white/75 mt-0.5">{c.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Attendance progress ── */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="section-header">
          <TrendingUp size={18} className="text-blue-600" />
          Attendance — {monthLabel(month)}
        </div>
        {totalPassed > 0 && (
          <p className="text-slate-500 text-xs mb-4">
            Based on {totalPassed} {schedule?.label.toLowerCase() ?? "class"} held so far
          </p>
        )}

        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
        ) : locationStudents.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
              <Users size={28} className="text-blue-300" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No students in {activeLocation} yet.</p>
          </div>
        ) : totalPassed === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3">
              <Calendar size={28} className="text-indigo-300" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No classes held yet this month.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {studentStats.map((s) => (
              <li key={s.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-slate-800 truncate mr-2">{s.name}</span>
                  <span className={`text-xs font-bold shrink-0 ${rateLabel(s.rate)}`}>
                    {s.attended}/{totalPassed} · {s.rate}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.max(s.rate, 3)}%`, background: rateColor(s.rate) }} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPassed > 0 && (
          <div className="flex gap-4 mt-4 flex-wrap text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />≥75% Good</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />≥50% OK</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />&lt;50% At risk</span>
          </div>
        )}
      </div>

      {/* ── All Locations overview ── */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="section-header">
          <MapPin size={18} className="text-blue-600" />
          All Locations — {monthLabel(month)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {locations.map((loc) => {
            const locStudents = students.filter((s) => s.location === loc);
            const locPaid     = payments.filter((p) => p.month === month && p.location === loc);
            const locTotal    = locPaid.reduce((sum, p) => sum + Number(p.amount), 0);
            const locPaidIds  = new Set(locPaid.map((p) => p.studentId));
            const locPending  = locStudents.filter((s) => !locPaidIds.has(s.id)).length;
            const feeRate     = locStudents.length > 0 ? Math.round((locPaid.length / locStudents.length) * 100) : 0;
            const locSched    = LOCATION_SCHEDULE[loc];
            const locDates    = getScheduledDates(loc, month);
            const locPassed   = passedScheduledDates(locDates).length;
            return (
              <div key={loc} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="font-extrabold text-slate-800 text-sm mb-1 flex items-center gap-2">
                  <MapPin size={13} className="text-blue-500 shrink-0" /> {loc}
                </div>
                {locSched && (
                  <div className="text-xs text-slate-500 mb-3">
                    {locSched.label} · {locPassed}/{locDates.length} held
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1.5 text-center mb-3">
                  <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
                    <div className="text-base font-extrabold text-blue-700">{locStudents.length}</div>
                    <div className="text-xs text-slate-500">Students</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
                    <div className="text-xs font-extrabold text-green-600">Rs.{locTotal > 0 ? (locTotal / 1000).toFixed(1) + "k" : "0"}</div>
                    <div className="text-xs text-slate-500">Collected</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
                    <div className="text-base font-extrabold text-amber-600">{locPending}</div>
                    <div className="text-xs text-slate-500">Pending</div>
                  </div>
                </div>
                {locStudents.length > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Fee collection</span><span className="font-bold">{feeRate}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill bg-blue-500" style={{ width: `${feeRate}%` }} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
