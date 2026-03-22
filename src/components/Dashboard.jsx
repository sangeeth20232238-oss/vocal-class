// src/components/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, TrendingUp, MapPin, Calendar, Bell, FileSpreadsheet } from "lucide-react";
import { getAttendanceForMonth, getPayments } from "../firestoreService";
import { getScheduledDates, LOCATION_SCHEDULE } from "../scheduleConfig";
import MonthlyReportButton from "./MonthlyReportButton";

const currentMonth = () => new Date().toISOString().slice(0, 7);
const monthLabel   = (m) => new Date(m + "-01").toLocaleDateString("en-LK", { month: "long", year: "numeric" });

function passedScheduledDates(scheduledDates) {
  const todayStr = new Date().toISOString().split("T")[0];
  return scheduledDates.filter((d) => d <= todayStr);
}

export default function Dashboard({ students, locations, activeLocation, onLocationChange }) {
  const [month, setMonth]               = useState(currentMonth());
  const [attendanceData, setAttendanceData] = useState([]);
  const [payments, setPayments]         = useState([]);
  const [loading, setLoading]           = useState(true);

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
  const annualTotal   = monthPayments.filter((p) => p.paymentType === "annual").reduce((s, p) => s + Number(p.amount), 0);
  const monthlyTotal  = monthPayments.filter((p) => p.paymentType !== "annual").reduce((s, p) => s + Number(p.amount), 0);

  const rateColor = (r) => r >= 75 ? "bg-green-500" : r >= 50 ? "bg-amber-400" : "bg-red-400";
  const rateLabel = (r) => r >= 75 ? "text-green-700" : r >= 50 ? "text-amber-600" : "text-red-600";

  const today        = new Date();
  const lastDay      = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isEndOfMonth = month === currentMonth() && today.getDate() >= lastDay - 2;

  return (
    <section className="space-y-4 sm:space-y-6">

      {/* Header + Month Picker */}
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-4 sm:p-5 border border-blue-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <LayoutDashboard size={22} className="text-blue-700 shrink-0" />
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-blue-800">Dashboard</h2>
            <p className="text-blue-500 text-xs sm:text-sm flex items-center gap-1 flex-wrap">
              {activeLocation} &middot; {locationStudents.length} students
              {schedule && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {schedule.label}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm sm:text-base font-semibold text-blue-900">Month:</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="border-2 border-blue-300 rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base focus:outline-none focus:border-blue-600" />
        </div>
      </div>

      {/* End-of-month banner */}
      {isEndOfMonth && (
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-4 sm:p-5 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <Bell size={24} className="text-yellow-300 animate-bounce shrink-0" />
            <div>
              <div className="text-base sm:text-lg font-extrabold">End of month approaching!</div>
              <div className="text-indigo-200 text-xs sm:text-sm">Send the monthly report to keep records up to date.</div>
            </div>
          </div>
          <MonthlyReportButton month={month} students={students} locations={locations} />
        </div>
      )}

      {/* Always-visible report button */}
      {!isEndOfMonth && (
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-4 sm:p-5 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet size={20} className="text-blue-600 shrink-0" />
            <div>
              <div className="text-base sm:text-lg font-bold text-blue-800">Monthly Report</div>
              <div className="text-blue-500 text-xs sm:text-sm">Download or email the report for {monthLabel(month)}</div>
            </div>
          </div>
          <MonthlyReportButton month={month} students={students} locations={locations} />
        </div>
      )}

      {/* City Switcher Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {locations.map((loc) => {
          const locStudents = students.filter((s) => s.location === loc);
          const locPaid     = payments.filter((p) => p.month === month && p.location === loc);
          const locTotal    = locPaid.reduce((sum, p) => sum + Number(p.amount), 0);
          const locSchedule = LOCATION_SCHEDULE[loc];
          const isActive    = activeLocation === loc;
          return (
            <button key={loc} onClick={() => onLocationChange(loc)}
              className={`rounded-2xl p-2 sm:p-3 text-left transition-colors duration-200 border-2 ${
                isActive
                  ? "bg-blue-700 border-blue-400 text-white shadow-lg ring-2 ring-blue-300"
                  : "bg-white/80 border-blue-100 text-blue-900 hover:border-blue-400 hover:bg-white shadow-md"
              }`}
            >
              <div className={`text-xs sm:text-sm font-extrabold mb-0.5 flex items-center gap-1 ${isActive ? "text-white" : "text-blue-800"}`}>
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{loc}</span>
                {isActive && <span className="text-xs bg-white/20 px-1 py-0.5 rounded-full shrink-0 ml-auto">&#10003;</span>}
              </div>
              <div className={`text-xs font-medium ${isActive ? "text-blue-200" : "text-blue-500"}`}>
                {locStudents.length} students
              </div>
              {locSchedule && (
                <div className={`text-xs font-semibold mt-0.5 hidden sm:block ${isActive ? "text-blue-200" : "text-blue-400"}`}>
                  {locSchedule.label}
                </div>
              )}
              <div className={`text-xs font-bold mt-0.5 ${isActive ? "text-green-300" : "text-green-600"}`}>
                Rs.{locTotal > 0 ? (locTotal / 1000).toFixed(1) + "k" : "0"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Schedule Info Banner */}
      {schedule && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} className="text-indigo-600 shrink-0" />
            <span className="font-bold text-indigo-800 text-sm sm:text-base">
              {activeLocation} &mdash; every {schedule.label}
            </span>
          </div>
          <div className="text-indigo-600 text-xs sm:text-sm mb-2">
            {totalScheduled} classes this month
            {totalPassed < totalScheduled
              ? ` · ${totalPassed} held · ${totalScheduled - totalPassed} upcoming`
              : ` · all ${totalScheduled} held`}
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {scheduledDates.map((d) => {
              const isPast  = d <= new Date().toISOString().split("T")[0];
              const dayNum  = new Date(d + "T00:00:00").getDate();
              return (
                <span key={d}
                  className={`text-xs sm:text-sm font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border ${
                    isPast
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-indigo-400 border-indigo-200"
                  }`}
                >
                  {dayNum}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Cards — 2 cols on mobile, 5 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        {[
          { label: "Students",       value: locationStudents.length,               icon: "🎤", bg: "from-blue-600 to-blue-800"    },
          { label: "Classes",        value: `${totalPassed}/${totalScheduled}`,    icon: "📅", bg: "from-indigo-500 to-indigo-700" },
          { label: "Monthly Fees",   value: `Rs.${(monthlyTotal/1000).toFixed(1)}k`, icon: "💰", bg: "from-green-500 to-green-700"   },
          { label: "Annual Fees",    value: `Rs.${(annualTotal/1000).toFixed(1)}k`,  icon: "🗓️", bg: "from-purple-500 to-purple-700"  },
          { label: "Pending",        value: pendingCount,                          icon: "⏳", bg: "from-amber-400 to-amber-600"   },
        ].map((c) => (
          <div key={c.label} className={`bg-gradient-to-br ${c.bg} text-white rounded-2xl p-3 sm:p-5 shadow-lg`}>
            <div className="text-2xl sm:text-4xl mb-1 sm:mb-2">{c.icon}</div>
            <div className="text-lg sm:text-2xl font-extrabold leading-tight">{c.value}</div>
            <div className="text-xs sm:text-sm font-medium opacity-85 mt-0.5 sm:mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance Progress per Student */}
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-4 sm:p-6 border border-blue-100">
        <h3 className="text-base sm:text-xl font-bold text-blue-800 mb-1 flex items-center gap-2">
          <TrendingUp size={18} /> Attendance &mdash; {month}
        </h3>
        {totalPassed > 0 && (
          <p className="text-blue-500 text-xs sm:text-sm mb-4">
            Based on {totalPassed} {schedule?.label.toLowerCase() ?? "class"} held so far
          </p>
        )}

        {loading ? (
          <div className="text-center py-8 text-blue-400">Loading&hellip;</div>
        ) : locationStudents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎤</div>
            <p className="text-blue-400">No students in {activeLocation} yet.</p>
          </div>
        ) : totalPassed === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📅</div>
            <p className="text-blue-400">No classes held yet this month.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {studentStats.map((s) => (
              <li key={s.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm sm:text-base font-semibold text-blue-900 truncate mr-2">{s.name}</span>
                  <span className={`text-xs sm:text-sm font-bold shrink-0 ${rateLabel(s.rate)}`}>
                    {s.attended}/{totalPassed} &middot; {s.rate}%
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`${rateColor(s.rate)} h-5 rounded-full transition-all duration-700 flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max(s.rate, 4)}%` }}
                  >
                    {s.rate >= 20 && <span className="text-white text-xs font-bold">{s.rate}%</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPassed > 0 && (
          <div className="flex gap-3 mt-4 flex-wrap text-xs sm:text-sm font-semibold">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />&ge;75% Good</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />&ge;50% OK</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />&lt;50% At risk</span>
          </div>
        )}
      </div>

      {/* All Locations Overview */}
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-4 sm:p-6 border border-blue-100">
        <h3 className="text-base sm:text-xl font-bold text-blue-800 mb-3 sm:mb-4 flex items-center gap-2">
          <MapPin size={18} /> All Locations &mdash; {month}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
              <div key={loc} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
                <div className="font-extrabold text-blue-800 text-base mb-1 flex items-center gap-2">
                  <MapPin size={15} className="text-blue-500 shrink-0" /> {loc}
                </div>
                {locSched && (
                  <div className="text-xs text-indigo-500 font-semibold mb-2">
                    {locSched.label} &middot; {locPassed}/{locDates.length} held
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-white rounded-xl p-2 shadow-sm">
                    <div className="text-lg font-extrabold text-blue-700">{locStudents.length}</div>
                    <div className="text-xs text-blue-500">Students</div>
                  </div>
                  <div className="bg-white rounded-xl p-2 shadow-sm">
                    <div className="text-sm font-extrabold text-green-600">Rs.{locTotal > 0 ? (locTotal / 1000).toFixed(1) + "k" : "0"}</div>
                    <div className="text-xs text-green-500">Collected</div>
                  </div>
                  <div className="bg-white rounded-xl p-2 shadow-sm">
                    <div className="text-lg font-extrabold text-amber-600">{locPending}</div>
                    <div className="text-xs text-amber-500">Pending</div>
                  </div>
                </div>
                {locStudents.length > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-blue-600 font-semibold mb-1">
                      <span>Fee rate</span><span>{feeRate}%</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${feeRate}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
