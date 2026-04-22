// src/components/FeeLedger.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Wallet, Search, CheckCircle, Clock, ChevronDown, ChevronUp, GraduationCap, Banknote, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import { recordPayment, getPayments, parseFirebaseError } from "../firestoreService";

const currentMonth = () => new Date().toISOString().slice(0, 7);
const MONTHLY_FEE  = 4500;
const TERM_FEE     = 12000;

const fmtDate = (ts) => {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
};

const PAY_TYPES = [
  { id: "monthly",     label: "Monthly",     default: MONTHLY_FEE, color: "bg-green-100 text-green-700",   badge: "📅" },
  { id: "term",        label: "Term Fee",    default: TERM_FEE,    color: "bg-indigo-100 text-indigo-700", badge: "🗓️" },
  { id: "scholarship", label: "Scholarship", default: 0,           color: "bg-purple-100 text-purple-700", badge: "🎓" },
];

function payTypeConfig(id) { return PAY_TYPES.find((t) => t.id === id) || PAY_TYPES[0]; }

function PayTypeBadge({ type }) {
  const cfg = payTypeConfig(type);
  return <span className={`badge ${cfg.color}`}>{cfg.badge} {cfg.label}</span>;
}

function PayTypeSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PAY_TYPES.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
            value === t.id
              ? "bg-blue-700 border-blue-700 text-white shadow-sm"
              : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
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
  const handleTypeChange = (t) => { setPayType(t); setAmount(String(payTypeConfig(t).default)); setDeduction("0"); };
  const net = isScholarship ? 0 : Math.max(0, Number(amount) - Number(deduction || 0));

  const handlePay = async () => {
    if (!isScholarship) {
      const amt = Number(amount), ded = Number(deduction || 0);
      if (!amount || isNaN(amt) || amt <= 0) { toast.error("Please enter a valid amount."); return; }
      if (ded < 0 || ded >= amt) { toast.error("Deduction cannot equal or exceed the amount."); return; }
    }
    setSaving(true);
    try {
      await recordPayment(student.id, student.name, month, net, student.location, payType, isScholarship ? 0 : Number(deduction || 0));
      toast.success(isScholarship ? `🎓 Scholarship recorded for ${student.name}!` : `Rs. ${net.toLocaleString()} recorded for ${student.name}!`);
      onPaid();
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not save. Please try again."));
    } finally { setSaving(false); }
  };

  return (
    <li className="rounded-xl border border-amber-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-extrabold text-amber-700 shrink-0">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-800 truncate block">{student.name}</span>
            <span className="badge bg-amber-100 text-amber-700 text-xs">{student.location}</span>
          </div>
        </div>
        <button onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-xl text-sm transition-colors shrink-0">
          <Banknote size={14} /> Mark Paid {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-amber-100 bg-amber-50 px-4 py-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Payment Type</p>
            <PayTypeSelector value={payType} onChange={handleTypeChange} />
          </div>
          {isScholarship ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <GraduationCap size={18} className="text-purple-600 shrink-0" />
              <p className="text-sm font-semibold text-purple-800">Scholarship — Rs. 0 (fully covered)</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Amount (Rs.)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  min="1" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Deduction (Rs.)</label>
                <input type="number" value={deduction} onChange={(e) => setDeduction(e.target.value)}
                  min="0" placeholder="0" className="input-field" />
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
              className={`font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60 text-white flex items-center gap-1.5 ${
                isScholarship ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"
              }`}>
              {saving ? "Saving…" : isScholarship ? "🎓 Confirm Scholarship" : `Confirm — Rs. ${net.toLocaleString()}`}
            </button>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700 font-semibold text-sm px-2">Cancel</button>
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
  const locationStudents = activeLocation === "All" ? students : students.filter((s) => s.location === activeLocation);
  const filtered = locationStudents.filter((s) => s.name.toLowerCase().includes(searchText.toLowerCase()));
  const selectStudent = (s) => { setStudentId(s.id); setSearchText(s.name); setShowDropdown(false); };

  useEffect(() => {
    const handler = (e) => { if (!searchRef.current?.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTypeChange = (t) => { setPayType(t); setAmount(String(payTypeConfig(t).default)); setDeduction("0"); };

  const loadPayments = useCallback(async () => {
    try { setPayments(await getPayments()); }
    catch (err) { toast.error(parseFirebaseError(err, "Could not load payments.")); }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const net = isScholarship ? 0 : Math.max(0, Number(amount) - Number(deduction || 0));

  const handleRecord = async () => {
    if (!studentId) { toast.error("Please select a student."); return; }
    if (!isScholarship) {
      const amt = Number(amount), ded = Number(deduction || 0);
      if (!amount || isNaN(amt) || amt <= 0) { toast.error("Please enter a valid amount."); return; }
      if (ded < 0 || ded >= amt) { toast.error("Deduction cannot equal or exceed the amount."); return; }
    }
    const student = students.find((s) => s.id === studentId);
    setSaving(true);
    try {
      await recordPayment(studentId, student.name, month, net, student.location, payType, isScholarship ? 0 : Number(deduction || 0));
      toast.success(isScholarship ? `🎓 Scholarship recorded for ${student.name}!` : `Rs. ${net.toLocaleString()} recorded for ${student.name}!`);
      setAmount(String(payTypeConfig(payType).default)); setDeduction("0"); setStudentId(""); setSearchText("");
      loadPayments();
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not save payment."));
    } finally { setSaving(false); }
  };

  const monthPayments = payments
    .filter((p) => p.month === month && (activeLocation === "All" || p.location === activeLocation))
    .sort((a, b) => (b.paidAt?.seconds || 0) - (a.paidAt?.seconds || 0));

  const paidIds      = new Set(monthPayments.map((p) => p.studentId));
  const pending      = locationStudents.filter((s) => !paidIds.has(s.id));
  const total        = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const termPmts     = monthPayments.filter((p) => p.paymentType === "term");
  const monthlyPmts  = monthPayments.filter((p) => p.paymentType === "monthly");
  const scholarships = monthPayments.filter((p) => p.paymentType === "scholarship");

  return (
    <section className="space-y-5">

      {/* Header */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#15803d,#0891b2)" }}>
            <Wallet size={18} className="text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Fee Ledger</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">Month:</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="input-field !w-auto text-sm py-1.5 px-3" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total Collected", value: `Rs.${(total/1000).toFixed(1)}k`, gradient: "linear-gradient(135deg,#1d4ed8,#1e40af)", icon: Banknote },
          { label: "Monthly",         value: monthlyPmts.length,               gradient: "linear-gradient(135deg,#15803d,#166534)", icon: Receipt  },
          { label: "Term Fee",        value: termPmts.length,                  gradient: "linear-gradient(135deg,#6d28d9,#5b21b6)", icon: Receipt  },
          { label: "Pending",         value: pending.length,                   gradient: "linear-gradient(135deg,#d97706,#b45309)", icon: Clock    },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card" style={{ background: c.gradient }}>
              <Icon size={16} className="text-white/70 mb-2" />
              <div className="text-xl sm:text-2xl font-extrabold">{c.value}</div>
              <div className="text-xs text-white/75 mt-0.5">{c.label}</div>
            </div>
          );
        })}
      </div>

      {/* Scholarship banner */}
      {scholarships.length > 0 && (
        <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 border-l-4 border-purple-500">
          <GraduationCap size={20} className="text-purple-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-purple-800">{scholarships.length} Scholarship Student{scholarships.length > 1 ? "s" : ""} this month</p>
            <p className="text-xs text-purple-600">{scholarships.map((p) => p.studentName).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Record Payment */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="section-header">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <CheckCircle size={17} className="text-blue-600" />
          </div>
          Record a Payment
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Payment Type</label>
          <PayTypeSelector value={payType} onChange={handleTypeChange} />
          {isScholarship && <p className="text-purple-600 text-xs mt-2 font-semibold">🎓 Scholarship students pay Rs. 0 — marked as paid.</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div ref={searchRef} className="relative">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Student</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setStudentId(""); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Type to search…"
                className="input-field !pl-9" />
            </div>
            {showDropdown && searchText && (
              <ul className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                {filtered.length === 0
                  ? <li className="px-4 py-3 text-slate-400 text-sm">No students found</li>
                  : filtered.map((s) => (
                    <li key={s.id} onMouseDown={() => selectStudent(s)}
                      className="px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-blue-50 cursor-pointer flex justify-between items-center">
                      <span>{s.name}</span>
                      <span className="badge bg-blue-100 text-blue-600">{s.location}</span>
                    </li>
                  ))
                }
              </ul>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field" />
          </div>

          {!isScholarship && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Amount (Rs.)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Deduction (Rs.)</label>
                <input type="number" value={deduction} onChange={(e) => setDeduction(e.target.value)} min="0" placeholder="0" className="input-field" />
              </div>
            </>
          )}
        </div>

        {!isScholarship && Number(deduction) > 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-800">
            Net after deduction: Rs. {net.toLocaleString()}
            <span className="ml-2 text-xs font-normal text-blue-500">(Rs. {Number(amount).toLocaleString()} − Rs. {Number(deduction).toLocaleString()})</span>
          </div>
        )}

        <button onClick={handleRecord} disabled={saving}
          className={`mt-4 flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 text-white ${
            isScholarship ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-700 hover:bg-blue-800"
          }`}>
          {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : isScholarship ? "🎓 Record Scholarship" : `Save — Rs. ${net.toLocaleString()}`}
        </button>
      </div>

      {/* Pending */}
      <div className="rounded-2xl p-4 sm:p-6 border border-amber-200 bg-amber-50/80 backdrop-blur">
        <div className="section-header text-amber-800">
          <Clock size={18} className="text-amber-600" />
          Pending — {month}
          <span className="badge bg-amber-200 text-amber-800 ml-auto">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "linear-gradient(135deg,#15803d,#16a34a)" }}>
              <CheckCircle size={26} className="text-white" />
            </div>
            <p className="text-green-700 font-bold text-base">Everyone has paid this month!</p>
            <p className="text-green-500 text-xs mt-1">All students are up to date.</p>
          </div>
        ) : (
          <ul className="space-y-2 sm:space-y-3">
            {pending.map((s) => <QuickPayRow key={s.id} student={s} month={month} onPaid={loadPayments} />)}
          </ul>
        )}
      </div>

      {/* Paid */}
      <div className="rounded-2xl p-4 sm:p-6 border border-green-200 bg-green-50/80 backdrop-blur">
        <div className="section-header text-green-800">
          <CheckCircle size={18} className="text-green-600" />
          Paid — {month}
          <span className="badge bg-green-200 text-green-800 ml-auto">{monthPayments.length}</span>
        </div>
        {monthPayments.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-green-100">
            {monthPayments.map((p) => (
              <li key={p.id} className="py-3 flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-slate-800 block truncate">{p.studentName}</span>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <PayTypeBadge type={p.paymentType} />
                    {p.deduction > 0 && <span className="text-xs text-amber-600 font-semibold">−Rs.{Number(p.deduction).toLocaleString()}</span>}
                    {p.paidAt && <span className="text-xs text-slate-400">{fmtDate(p.paidAt)}</span>}
                  </div>
                </div>
                <span className={`text-base font-extrabold shrink-0 ${p.paymentType === "scholarship" ? "text-purple-600" : "text-green-700"}`}>
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
