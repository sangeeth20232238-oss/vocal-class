// src/components/FeeLedger.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Wallet, Search, CheckCircle, Clock, ChevronDown, ChevronUp, GraduationCap } from "lucide-react";
import toast from "react-hot-toast";
import { recordPayment, getPayments } from "../firestoreService";

const currentMonth = () => new Date().toISOString().slice(0, 7);
const MONTHLY_FEE  = 4500;
const TERM_FEE     = 12000;

const fmtDate = (ts) => {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-LK", {
    day: "numeric", month: "short", year: "numeric",
  });
};

// Payment type config — single source of truth
const PAY_TYPES = [
  { id: "monthly",     label: "Monthly",     default: MONTHLY_FEE,  color: "bg-green-100 text-green-700",  badge: "📅" },
  { id: "term",        label: "Term Fee",    default: TERM_FEE,     color: "bg-indigo-100 text-indigo-700", badge: "🗓️" },
  { id: "scholarship", label: "Scholarship", default: 0,            color: "bg-purple-100 text-purple-700", badge: "🎓" },
];

function payTypeConfig(id) {
  return PAY_TYPES.find((t) => t.id === id) || PAY_TYPES[0];
}

function PayTypeBadge({ type }) {
  const cfg = payTypeConfig(type);
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.badge} {cfg.label}
    </span>
  );
}

function PayTypeSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PAY_TYPES.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
            value === t.id
              ? "bg-blue-700 border-blue-700 text-white shadow-md"
              : "bg-white border-blue-200 text-blue-700 hover:border-blue-400"
          }`}>
          {t.badge} {t.label}
        </button>
      ))}
    </div>
  );
}

function QuickPayRow({ student, month, onPaid }) {
  const [open, setOpen]           = useState(false);
  const [payType, setPayType]     = useState("monthly");
  const [amount, setAmount]       = useState(String(MONTHLY_FEE));
  const [deduction, setDeduction] = useState("0");
  const [saving, setSaving]       = useState(false);

  const isScholarship = payType === "scholarship";

  const handleTypeChange = (t) => {
    setPayType(t);
    setAmount(String(payTypeConfig(t).default));
    setDeduction("0");
  };

  const net = isScholarship ? 0 : Math.max(0, Number(amount) - Number(deduction || 0));

  const handlePay = async () => {
    if (!isScholarship) {
      const amt = Number(amount);
      const ded = Number(deduction || 0);
      if (!amount || isNaN(amt) || amt <= 0) { toast.error("Please enter a valid amount."); return; }
      if (ded < 0 || ded >= amt) { toast.error("Deduction cannot be equal to or more than the amount."); return; }
    }
    setSaving(true);
    try {
      await recordPayment(student.id, student.name, month, net, student.location, payType, isScholarship ? 0 : Number(deduction || 0));
      toast.success(isScholarship
        ? `🎓 Scholarship recorded for ${student.name}!`
        : `Rs. ${net.toLocaleString()} recorded for ${student.name}!`);
      onPaid();
    } catch {
      toast.error("Could not save. Please try again.");
    } finally { setSaving(false); }
  };

  return (
    <li className="rounded-xl border border-amber-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 gap-2 flex-wrap">
        <div className="min-w-0">
          <span className="text-sm sm:text-base font-semibold text-amber-900 truncate block">{student.name}</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{student.location}</span>
        </div>
        <button onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-xl text-sm transition-colors shrink-0">
          Mark Paid {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-amber-100 bg-amber-50 px-3 sm:px-4 py-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-amber-800 mb-2">Payment Type</p>
            <PayTypeSelector value={payType} onChange={handleTypeChange} />
          </div>

          {/* Scholarship — no amount needed */}
          {isScholarship ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <GraduationCap size={20} className="text-purple-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-purple-800">Scholarship Student</p>
                <p className="text-xs text-purple-600">This student pays Rs. 0 — fully covered by scholarship.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">Amount (Rs.)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  min="1" className="border-2 border-amber-300 rounded-xl px-3 py-2 text-base w-full focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">Deduction (Rs.)</label>
                <input type="number" value={deduction} onChange={(e) => setDeduction(e.target.value)}
                  min="0" placeholder="0" className="border-2 border-amber-300 rounded-xl px-3 py-2 text-base w-full focus:outline-none focus:border-amber-500" />
              </div>
              {Number(deduction) > 0 && (
                <div className="col-span-2 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-amber-800">
                  Net: Rs. {net.toLocaleString()}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button onClick={handlePay} disabled={saving}
              className={`font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60 text-white ${
                isScholarship ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"
              }`}>
              {saving ? "Saving…" : isScholarship ? "🎓 Confirm Scholarship" : `Confirm — Rs. ${net.toLocaleString()}`}
            </button>
            <button onClick={() => setOpen(false)} className="text-amber-600 hover:text-amber-800 font-semibold text-sm px-2">
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function FeeLedger({ students, activeLocation }) {
  const [payments, setPayments]         = useState([]);
  const [studentId, setStudentId]       = useState("");
  const [searchText, setSearchText]     = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [month, setMonth]               = useState(currentMonth());
  const [payType, setPayType]           = useState("monthly");
  const [amount, setAmount]             = useState(String(MONTHLY_FEE));
  const [deduction, setDeduction]       = useState("0");
  const [saving, setSaving]             = useState(false);
  const searchRef = useRef(null);

  const isScholarship = payType === "scholarship";

  const locationStudents = activeLocation === "All"
    ? students : students.filter((s) => s.location === activeLocation);

  const filtered = locationStudents.filter((s) =>
    s.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectStudent = (s) => { setStudentId(s.id); setSearchText(s.name); setShowDropdown(false); };

  useEffect(() => {
    const handler = (e) => { if (!searchRef.current?.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTypeChange = (t) => {
    setPayType(t);
    setAmount(String(payTypeConfig(t).default));
    setDeduction("0");
  };

  const loadPayments = useCallback(async () => {
    try { setPayments(await getPayments()); }
    catch { toast.error("Could not load payments. Check your connection."); }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const net = isScholarship ? 0 : Math.max(0, Number(amount) - Number(deduction || 0));

  const handleRecord = async () => {
    if (!studentId) { toast.error("Please select a student from the list."); return; }
    if (!isScholarship) {
      const amt = Number(amount);
      const ded = Number(deduction || 0);
      if (!amount || isNaN(amt) || amt <= 0) { toast.error("Please enter a valid amount greater than zero."); return; }
      if (ded < 0 || ded >= amt) { toast.error("Deduction cannot be equal to or more than the amount."); return; }
    }
    const student = students.find((s) => s.id === studentId);
    setSaving(true);
    try {
      await recordPayment(studentId, student.name, month, net, student.location, payType, isScholarship ? 0 : Number(deduction || 0));
      const cfg = payTypeConfig(payType);
      toast.success(isScholarship
        ? `🎓 Scholarship recorded for ${student.name}!`
        : `Rs. ${net.toLocaleString()} (${cfg.label}) recorded for ${student.name}!`);
      setAmount(String(payTypeConfig(payType).default));
      setDeduction("0"); setStudentId(""); setSearchText("");
      loadPayments();
    } catch {
      toast.error("Could not save payment. Please try again.");
    } finally { setSaving(false); }
  };

  const monthPayments = payments
    .filter((p) => p.month === month && (activeLocation === "All" || p.location === activeLocation))
    .sort((a, b) => (b.paidAt?.seconds || 0) - (a.paidAt?.seconds || 0));

  const paidIds       = new Set(monthPayments.map((p) => p.studentId));
  const pending       = locationStudents.filter((s) => !paidIds.has(s.id));
  const total         = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const termPmts      = monthPayments.filter((p) => p.paymentType === "term");
  const monthlyPmts   = monthPayments.filter((p) => p.paymentType === "monthly");
  const scholarships  = monthPayments.filter((p) => p.paymentType === "scholarship");

  return (
    <section className="space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-4 sm:p-5 border border-blue-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Wallet size={22} className="text-blue-700 shrink-0" />
          <h2 className="text-lg sm:text-2xl font-bold text-blue-800">Fee Ledger</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-blue-900">Month:</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="border-2 border-blue-300 rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base focus:outline-none focus:border-blue-600" />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-blue-700 text-white rounded-2xl p-3 sm:p-4 text-center shadow-md">
          <div className="text-lg sm:text-2xl font-extrabold">Rs.{(total/1000).toFixed(1)}k</div>
          <div className="text-xs sm:text-sm opacity-90 mt-0.5">💰 Total Collected</div>
        </div>
        <div className="bg-green-600 text-white rounded-2xl p-3 sm:p-4 text-center shadow-md">
          <div className="text-lg sm:text-2xl font-extrabold">{monthlyPmts.length}</div>
          <div className="text-xs sm:text-sm opacity-90 mt-0.5">📅 Monthly</div>
        </div>
        <div className="bg-indigo-600 text-white rounded-2xl p-3 sm:p-4 text-center shadow-md">
          <div className="text-lg sm:text-2xl font-extrabold">{termPmts.length}</div>
          <div className="text-xs sm:text-sm opacity-90 mt-0.5">🗓️ Term Fee</div>
        </div>
        <div className="bg-amber-500 text-white rounded-2xl p-3 sm:p-4 text-center shadow-md">
          <div className="text-lg sm:text-2xl font-extrabold">{pending.length}</div>
          <div className="text-xs sm:text-sm opacity-90 mt-0.5">⏳ Pending</div>
        </div>
      </div>

      {/* Scholarship banner if any */}
      {scholarships.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <GraduationCap size={22} className="text-purple-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-purple-800">{scholarships.length} Scholarship Student{scholarships.length > 1 ? "s" : ""} this month</p>
            <p className="text-xs text-purple-600">{scholarships.map((p) => p.studentName).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Record a Payment */}
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-4 sm:p-6 border border-blue-100">
        <h3 className="text-base sm:text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
          <CheckCircle size={20} className="text-blue-600 shrink-0" /> Record a Payment
        </h3>

        <div className="mb-4">
          <label className="block text-sm sm:text-base font-semibold text-blue-900 mb-2">Payment Type</label>
          <PayTypeSelector value={payType} onChange={handleTypeChange} />
          {isScholarship && (
            <p className="text-purple-600 text-xs mt-2 font-semibold">
              🎓 Scholarship students pay Rs. 0 — they will be marked as paid and removed from the pending list.
            </p>
          )}
          {!isScholarship && (
            <p className="text-blue-400 text-xs mt-1">
              Default: Rs. {payTypeConfig(payType).default.toLocaleString()}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Student search */}
          <div ref={searchRef} className="relative">
            <label className="block text-sm font-semibold text-blue-900 mb-1">Student</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
              <input type="text" value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setStudentId(""); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Type to search…"
                className="w-full border-2 border-blue-300 rounded-xl pl-9 pr-4 py-2.5 text-sm sm:text-base focus:outline-none focus:border-blue-600" />
            </div>
            {showDropdown && searchText && (
              <ul className="absolute z-20 w-full bg-white border-2 border-blue-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                {filtered.length === 0
                  ? <li className="px-4 py-3 text-blue-400 text-sm">No students found</li>
                  : filtered.map((s) => (
                    <li key={s.id} onMouseDown={() => selectStudent(s)}
                      className="px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-50 cursor-pointer flex justify-between items-center">
                      <span>{s.name}</span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{s.location}</span>
                    </li>
                  ))
                }
              </ul>
            )}
          </div>

          {/* Month */}
          <div>
            <label className="block text-sm font-semibold text-blue-900 mb-1">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="w-full border-2 border-blue-300 rounded-xl px-3 py-2.5 text-sm sm:text-base focus:outline-none focus:border-blue-600" />
          </div>

          {/* Amount + Deduction — hidden for scholarship */}
          {!isScholarship && (
            <>
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-1">Amount (Rs.)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  min="1" className="w-full border-2 border-blue-300 rounded-xl px-3 py-2.5 text-sm sm:text-base focus:outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-1">Deduction (Rs.)</label>
                <input type="number" value={deduction} onChange={(e) => setDeduction(e.target.value)}
                  min="0" placeholder="0"
                  className="w-full border-2 border-blue-300 rounded-xl px-3 py-2.5 text-sm sm:text-base focus:outline-none focus:border-blue-600" />
              </div>
            </>
          )}
        </div>

        {!isScholarship && Number(deduction) > 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-800">
            Net after deduction: Rs. {net.toLocaleString()}
            <span className="ml-2 text-xs font-normal text-blue-500">
              (Rs. {Number(amount).toLocaleString()} &minus; Rs. {Number(deduction).toLocaleString()})
            </span>
          </div>
        )}

        <button onClick={handleRecord} disabled={saving}
          className={`mt-4 w-full sm:w-auto disabled:opacity-60 text-white text-sm sm:text-base font-bold px-6 py-3 rounded-xl transition-colors ${
            isScholarship ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-700 hover:bg-blue-800"
          }`}>
          {saving ? "Saving…" : isScholarship ? "🎓 Record Scholarship" : `Save — Rs. ${net.toLocaleString()}`}
        </button>
      </div>

      {/* Pending Payments */}
      <div className="bg-amber-50 rounded-2xl shadow-md p-4 sm:p-6 border border-amber-200">
        <h3 className="text-base sm:text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
          <Clock size={20} className="shrink-0" /> Pending &mdash; {month}
          <span className="ml-auto text-sm bg-amber-200 text-amber-800 px-3 py-1 rounded-full font-bold">
            {pending.length}
          </span>
        </h3>
        {pending.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-green-700 font-bold text-base">Everyone has paid this month!</p>
          </div>
        ) : (
          <ul className="space-y-2 sm:space-y-3">
            {pending.map((s) => (
              <QuickPayRow key={s.id} student={s} month={month} onPaid={loadPayments} />
            ))}
          </ul>
        )}
      </div>

      {/* Paid This Month */}
      <div className="bg-green-50 rounded-2xl shadow-md p-4 sm:p-6 border border-green-200">
        <h3 className="text-base sm:text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
          <CheckCircle size={20} className="shrink-0" /> Paid &mdash; {month}
          <span className="ml-auto text-sm bg-green-200 text-green-800 px-3 py-1 rounded-full font-bold">
            {monthPayments.length}
          </span>
        </h3>
        {monthPayments.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-green-100">
            {monthPayments.map((p) => (
              <li key={p.id} className="py-3 flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="text-sm sm:text-base font-semibold text-green-900 block truncate">{p.studentName}</span>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    <PayTypeBadge type={p.paymentType} />
                    {p.deduction > 0 && (
                      <span className="text-xs text-amber-600 font-semibold">
                        &minus;Rs.{Number(p.deduction).toLocaleString()}
                      </span>
                    )}
                    {p.paidAt && <span className="text-xs text-green-600">{fmtDate(p.paidAt)}</span>}
                  </div>
                </div>
                <span className={`text-base sm:text-lg font-extrabold shrink-0 ${p.paymentType === "scholarship" ? "text-purple-600" : "text-green-700"}`}>
                  {p.paymentType === "scholarship" ? "🎓 Free" : `Rs.${Number(p.amount).toLocaleString()}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </section>
  );
}
