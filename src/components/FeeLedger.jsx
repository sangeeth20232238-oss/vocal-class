// src/components/FeeLedger.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Wallet, Search, CheckCircle, Clock, ChevronDown, ChevronUp, GraduationCap, Banknote, Receipt, Trash2, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { recordPayment, getPayments, deletePayment, parseFirebaseError, getRegisteredStudentIds } from "../firestoreService";
import { LOCATION_CLASS_GROUPS } from "../scheduleConfig";
import ConfirmActionModal from "./ConfirmActionModal";

const currentMonth = () => new Date().toISOString().slice(0, 7);
const MONTHLY_FEE  = 4500;
const TERM_FEE     = 12000;
const REG_FEE      = 1000;

const fmtDate = (ts) => {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
};

// Returns "YYYY-MM" from a Firestore timestamp or null
const tsToMonth = (ts) => {
  if (!ts?.seconds) return null;
  return new Date(ts.seconds * 1000).toISOString().slice(0, 7);
};

const PAY_TYPES = [
  { id: "monthly",      label: "Monthly",      default: MONTHLY_FEE, color: "bg-green-100 text-green-700",   badge: "📅" },
  { id: "term",         label: "Term Fee",     default: TERM_FEE,    color: "bg-indigo-100 text-indigo-700", badge: "🗓️" },
  { id: "registration", label: "Registration", default: REG_FEE,     color: "bg-blue-100 text-blue-700",     icon: ClipboardList },
  { id: "scholarship",  label: "Scholarship",  default: 0,           color: "bg-purple-100 text-purple-700", badge: "🎓" },
];

function payTypeConfig(id) { return PAY_TYPES.find((t) => t.id === id) || PAY_TYPES[0]; }

function PayTypeBadge({ type }) {
  const cfg = payTypeConfig(type);
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.color} inline-flex items-center gap-1`}>
      {Icon ? <Icon size={11} /> : cfg.badge} {cfg.label}
    </span>
  );
}

function PayTypeSelector({ value, onChange, exclude = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PAY_TYPES.filter((t) => !exclude.includes(t.id)).map((t) => {
        const Icon = t.icon;
        return (
          <button key={t.id} type="button" onClick={() => onChange(t.id)}
            className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all inline-flex items-center gap-1.5 ${
              value === t.id
                ? "bg-blue-700 border-blue-700 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
            }`}>
            {Icon ? <Icon size={14} /> : t.badge} {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Paid row with delete ──────────────────────────────────────────────────────
function PaidRow({ p, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePayment(p.id);
      toast.success(`Payment for ${p.studentName} removed.`);
      onDeleted(); // may unmount this component
    } catch (err) {
      // only update state if still mounted (error path — component stays)
      if (mountedRef.current) {
        toast.error(parseFirebaseError(err, "Could not remove payment."));
        setDeleting(false);
        setConfirming(false);
      }
    }
  };

  const amountDisplay = p.paymentType === "scholarship"
    ? <span className="text-base font-extrabold text-purple-600">🎓 Free</span>
    : p.paymentType === "registration"
    ? <span className="text-base font-extrabold text-blue-600">Rs.{Number(p.amount).toLocaleString()}</span>
    : <span className="text-base font-extrabold text-green-700">Rs.{Number(p.amount).toLocaleString()}</span>;

  return (
    <li className="py-2.5 px-3 flex justify-between items-center gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <PayTypeBadge type={p.paymentType} />
        {p.deduction > 0 && <span className="text-xs text-amber-600 font-semibold">−Rs.{Number(p.deduction).toLocaleString()}</span>}
        {p.paidAt && <span className="text-xs text-slate-400">{fmtDate(p.paidAt)}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {amountDisplay}
        {!confirming ? (
          <button onClick={() => setConfirming(true)} title="Remove / correct this payment"
            className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl px-2 py-1">
            <span className="text-xs font-semibold text-red-700 hidden sm:block">Delete?</span>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger btn-inline-sm text-xs py-1 px-2">
              {deleting ? "…" : "Yes"}
            </button>
            <button onClick={() => setConfirming(false)} className="btn-inline-sm text-slate-500 hover:text-slate-700 text-xs font-semibold px-1">No</button>
          </div>
        )}
      </div>
    </li>
  );
}

// ── Quick-pay row in Pending list ─────────────────────────────────────────────
function QuickPayRow({ student, month, onPaid, regPaid }) {
  const [open, setOpen]           = useState(false);
  const [payType, setPayType]     = useState("monthly");
  const [amount, setAmount]       = useState(String(MONTHLY_FEE));
  const [deduction, setDeduction] = useState("0");
  const [saving, setSaving]       = useState(false);
  const [reviewing, setReviewing] = useState(false);

  // Reset form whenever month changes or row is closed
  useEffect(() => {
    setOpen(false);
    setPayType("monthly");
    setAmount(String(MONTHLY_FEE));
    setDeduction("0");
  }, [month]);

  const isScholarship = payType === "scholarship";
  // registration excluded — it's recorded separately via the main form
  const handleTypeChange = (t) => { setPayType(t); setAmount(String(payTypeConfig(t).default)); setDeduction("0"); };
  const net = isScholarship ? 0 : Math.max(0, Number(amount) - Number(deduction || 0));

  const reset = () => { setOpen(false); setReviewing(false); setPayType("monthly"); setAmount(String(MONTHLY_FEE)); setDeduction("0"); };

  const handlePayClick = () => {
    if (!isScholarship) {
      const amt = Number(amount), ded = Number(deduction || 0);
      if (!amount || isNaN(amt) || amt <= 0) { toast.error("Please enter a valid amount."); return; }
      if (ded < 0 || ded > amt) { toast.error("Deduction cannot exceed the amount."); return; }
    }
    setReviewing(true);
  };

  const handlePay = async () => {
    setSaving(true);
    try {
      await recordPayment(student.id, student.name, month, net, student.location, payType, isScholarship ? 0 : Number(deduction || 0));
      toast.success(isScholarship ? `🎓 Scholarship recorded for ${student.name}!` : `Rs. ${net.toLocaleString()} recorded for ${student.name}!`);
      reset();
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="badge bg-amber-100 text-amber-700 text-xs">{student.location}</span>
              {student.classGroup && (() => {
                const groups = LOCATION_CLASS_GROUPS[student.location] || [];
                const label  = groups.find((g) => g.id === student.classGroup)?.label;
                return label ? <span className="badge bg-violet-100 text-violet-700 text-xs">{label}</span> : null;
              })()}
            </div>
          </div>
        </div>
        <button onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-xl text-sm transition-colors shrink-0">
          <Banknote size={14} /> Mark Paid {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      {!regPaid && (
        <div className="px-4 py-1.5 bg-orange-50 border-t border-orange-100 flex items-center gap-1.5">
          <ClipboardList size={11} className="text-orange-500 shrink-0" />
          <span className="text-xs font-semibold text-orange-700">Registration fee not yet recorded — use the orange section above to add it.</span>
        </div>
      )}

      {open && (
        <div className="border-t border-amber-100 bg-amber-50 px-4 py-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Payment Type</p>
            <PayTypeSelector value={payType} onChange={handleTypeChange} exclude={["registration"]} />
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
            <button onClick={handlePayClick} disabled={saving}
              className={`font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60 text-white flex items-center gap-1.5 ${
                isScholarship ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"
              }`}>
              {saving
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                : isScholarship ? "🎓 Review & Confirm" : `Review — Rs. ${net.toLocaleString()}`}
            </button>
            <button onClick={reset} className="text-slate-500 hover:text-slate-700 font-semibold text-sm px-2">Cancel</button>
          </div>
        </div>
      )}

      {reviewing && (
        <ConfirmActionModal
          title="Confirm Payment"
          rows={[
            { label: "Student",      value: student.name },
            { label: "Month",        value: month },
            { label: "Payment Type", value: payType.charAt(0).toUpperCase() + payType.slice(1) },
            { label: "Amount",       value: isScholarship ? "Scholarship (Free)" : `Rs. ${net.toLocaleString()}`, highlight: true },
            ...(Number(deduction) > 0 ? [{ label: "Deduction", value: `Rs. ${Number(deduction).toLocaleString()}` }] : []),
          ]}
          onConfirm={() => { setReviewing(false); handlePay(); }}
          onCancel={() => setReviewing(false)}
          confirmLabel={isScholarship ? "🎓 Confirm Scholarship" : `Confirm — Rs. ${net.toLocaleString()}`}
          confirmClass={isScholarship ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"}
        />
      )}
    </li>
  );
}

// ── One-tap registration fee row for existing students ───────────────────────
function RegFeeRow({ student, onPaid }) {
  const [open, setOpen]         = useState(false);
  const [amount, setAmount]     = useState(String(REG_FEE));
  const [deduction, setDeduction] = useState("0");
  const [saving, setSaving]     = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const month = new Date().toISOString().slice(0, 7);
  const net   = Math.max(0, Number(amount) - Number(deduction || 0));

  const handleClick = () => {
    const amt = Number(amount), ded = Number(deduction || 0);
    if (!amount || isNaN(amt) || amt < 0) { toast.error("Enter a valid amount."); return; }
    if (ded > amt) { toast.error("Deduction cannot exceed amount."); return; }
    setReviewing(true);
  };

  const handleSave = async () => {
    setReviewing(false);
    setSaving(true);
    try {
      await recordPayment(student.id, student.name, month, net, student.location, "registration", Number(deduction || 0));
      toast.success(`Registration fee recorded for ${student.name}!`);
      onPaid();
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not save."));
    } finally { setSaving(false); }
  };

  return (
    <li className="bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-extrabold text-orange-700 shrink-0">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-800 truncate block">{student.name}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="badge bg-orange-100 text-orange-700 text-xs">{student.location}</span>
              {student.classGroup && (() => {
                const groups = LOCATION_CLASS_GROUPS[student.location] || [];
                const label  = groups.find((g) => g.id === student.classGroup)?.label;
                return label ? <span className="badge bg-violet-100 text-violet-700 text-xs">{label}</span> : null;
              })()}
            </div>
          </div>
        </div>
        <button onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-xl text-sm transition-colors shrink-0">
          <ClipboardList size={14} /> Record Reg Fee {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-orange-100 bg-orange-50 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Fee (Rs.)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Deduction (Rs.)</label>
              <input type="number" value={deduction} onChange={(e) => setDeduction(e.target.value)} min="0" placeholder="0" className="input-field" />
            </div>
          </div>
          {Number(deduction) > 0 && (
            <p className="text-xs font-semibold text-orange-700">Net: Rs. {net.toLocaleString()}</p>
          )}
          <div className="flex gap-2">
            <button onClick={handleClick} disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors">
              {saving
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                : `Review — Rs. ${net.toLocaleString()}`}
            </button>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700 font-semibold text-sm px-2">Cancel</button>
          </div>
        </div>
      )}
      {reviewing && (
        <ConfirmActionModal
          title="Record Registration Fee"
          rows={[
            { label: "Student",    value: student.name },
            { label: "Location",   value: student.location },
            { label: "Fee",        value: `Rs. ${net.toLocaleString()}`, highlight: true },
            { label: "Month",      value: month },
          ]}
          onConfirm={handleSave}
          onCancel={() => setReviewing(false)}
          confirmLabel={`Confirm — Rs. ${net.toLocaleString()}`}
          confirmClass="bg-orange-600 hover:bg-orange-700"
        />
      )}
    </li>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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
  const [reviewPayment, setReviewPayment] = useState(null);
  const [regPaidIds, setRegPaidIds]       = useState(new Set());
  const searchRef = useRef(null);

  const isScholarship = payType === "scholarship";
  const locationStudents = activeLocation === "All" ? students : students.filter((s) => s.location === activeLocation);

  // FIX: only show students who existed at or before the selected month
  const eligibleStudents = locationStudents.filter((s) => {
    const joined = tsToMonth(s.createdAt);
    return !joined || joined <= month;
  });

  // Search across ALL location students (not just eligible) so Aunty can
  // record a payment for any student regardless of join month
  const filtered = locationStudents.filter((s) => s.name.toLowerCase().includes(searchText.toLowerCase()));
  const selectStudent = (s) => { setStudentId(s.id); setSearchText(s.name); setShowDropdown(false); };

  useEffect(() => {
    const handler = (e) => { if (!searchRef.current?.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTypeChange = (t) => { setPayType(t); setAmount(String(payTypeConfig(t).default)); setDeduction("0"); };

  const loadPayments = useCallback(async () => {
    try {
      const [pmts, regIds] = await Promise.all([getPayments(), getRegisteredStudentIds()]);
      setPayments(pmts);
      setRegPaidIds(regIds);
    }
    catch (err) { toast.error(parseFirebaseError(err, "Could not load payments.")); }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const net = isScholarship ? 0 : Math.max(0, Number(amount) - Number(deduction || 0));

  // Reset student selection when month changes
  useEffect(() => {
    setStudentId("");
    setSearchText("");
    setDeduction("0");
  }, [month]);

  const handleRecord = () => {
    if (!studentId) { toast.error("Please select a student."); return; }
    if (!isScholarship) {
      const amt = Number(amount), ded = Number(deduction || 0);
      if (!amount || isNaN(amt) || amt <= 0) { toast.error("Please enter a valid amount."); return; }
      if (ded < 0 || ded > amt) { toast.error("Deduction cannot exceed the amount."); return; }
    }
    const student = students.find((s) => s.id === studentId);
    const isDupe  = monthPayments.some((p) => p.studentId === studentId && p.paymentType === payType);
    setReviewPayment({ student, isDupe });
  };

  const handleConfirmRecord = async () => {
    const student = reviewPayment?.student;
    setReviewPayment(null);
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

  // A student is "paid" only if they have a monthly/term/scholarship payment (registration alone doesn't count)
  const paidIds = new Set(
    monthPayments
      .filter((p) => p.paymentType !== "registration")
      .map((p) => p.studentId)
  );
  const pending            = eligibleStudents.filter((s) => !paidIds.has(s.id));
  const total              = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const termPmts           = monthPayments.filter((p) => p.paymentType === "term");
  const monthlyPmts        = monthPayments.filter((p) => p.paymentType === "monthly");
  const scholarships       = monthPayments.filter((p) => p.paymentType === "scholarship");
  const regPmts            = monthPayments.filter((p) => p.paymentType === "registration");
  // Students who have NEVER had a registration payment recorded (across all time)
  const unregistered       = locationStudents.filter((s) => !regPaidIds.has(s.id));

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

      {/* ── Registration alert — students with NO reg payment ever ── */}
      {unregistered.length > 0 && (
        <div className="rounded-2xl border-2 border-orange-400 bg-orange-50 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#ea580c,#c2410c)" }}>
            <ClipboardList size={20} className="text-white shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-extrabold text-sm">
                {unregistered.length} student{unregistered.length !== 1 ? "s" : ""} — registration fee not recorded
              </p>
              <p className="text-orange-200 text-xs mt-0.5">These students were added before registration tracking. Record their fee now.</p>
            </div>
            <span className="bg-white/20 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shrink-0">{unregistered.length}</span>
          </div>
          <ul className="divide-y divide-orange-100">
            {unregistered.map((s) => (
              <RegFeeRow key={s.id} student={s} onPaid={loadPayments} />
            ))}
          </ul>
        </div>
      )}

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

      {/* Registration fee banner */}
      {regPmts.length > 0 && (
        <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 border-l-4 border-blue-400">
          <ClipboardList size={20} className="text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-800">{regPmts.length} Registration Fee{regPmts.length > 1 ? "s" : ""} collected this month</p>
            <p className="text-xs text-blue-600">{regPmts.map((p) => p.studentName).join(", ")}</p>
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
        <p className="text-xs text-slate-400 mb-3">Use <strong>Registration</strong> for one-time enrolment fees. Use <strong>Monthly</strong> or <strong>Term Fee</strong> for recurring payments.</p>

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

        <button onClick={handleRecord} disabled={saving || !studentId}
          className={`mt-4 flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 text-white ${
            isScholarship ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-700 hover:bg-blue-800"
          }`}>
          {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : isScholarship ? "🎓 Record Scholarship" : `Review & Save — Rs. ${net.toLocaleString()}`}
        </button>
      </div>

      {reviewPayment && (() => {
        const { student, isDupe } = reviewPayment;
        const cgLabel = (() => {
          const groups = LOCATION_CLASS_GROUPS[student?.location] || [];
          return groups.find((g) => g.id === student?.classGroup)?.label || null;
        })();
        const rows = [
          { label: "Student",      value: student?.name },
          { label: "Location",     value: student?.location },
          ...(cgLabel ? [{ label: "Class Group", value: cgLabel }] : []),
          { label: "Month",        value: month },
          { label: "Payment Type", value: payType.charAt(0).toUpperCase() + payType.slice(1) },
          { label: "Amount",       value: isScholarship ? "Scholarship (Free)" : `Rs. ${net.toLocaleString()}`, highlight: true },
          ...(Number(deduction) > 0 ? [{ label: "Deduction", value: `Rs. ${Number(deduction).toLocaleString()}` }] : []),
        ];
        return (
          <ConfirmActionModal
            title="Review Payment"
            rows={rows}
            warning={isDupe ? `${student?.name} already has a ${payType} payment for ${month}. Recording another one.` : undefined}
            onConfirm={handleConfirmRecord}
            onCancel={() => setReviewPayment(null)}
            confirmLabel={isScholarship ? "🎓 Confirm Scholarship" : `Confirm — Rs. ${net.toLocaleString()}`}
            confirmClass={isScholarship ? "bg-purple-600 hover:bg-purple-700" : "bg-green-600 hover:bg-green-700"}
          />
        );
      })()}

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
            {pending.map((s) => <QuickPayRow key={s.id} student={s} month={month} onPaid={loadPayments} regPaid={regPaidIds.has(s.id)} />)}
          </ul>
        )}
      </div>

      {/* Paid — grouped by student */}
      <div className="rounded-2xl p-4 sm:p-6 border border-green-200 bg-green-50/80 backdrop-blur">
        <div className="section-header text-green-800">
          <CheckCircle size={18} className="text-green-600" />
          Paid — {month}
          <span className="badge bg-green-200 text-green-800 ml-auto">{paidIds.size} student{paidIds.size !== 1 ? "s" : ""}</span>
        </div>
        {monthPayments.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No payments recorded yet.</p>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
              <Trash2 size={11} /> Tap the bin icon to undo / correct a wrong entry.
            </p>
            <ul className="space-y-3">
              {/* Group payments by student */}
              {Array.from(
                monthPayments.reduce((map, p) => {
                  if (!map.has(p.studentId)) map.set(p.studentId, { name: p.studentName, main: [], reg: [] });
                  const entry = map.get(p.studentId);
                  if (p.paymentType === "registration") entry.reg.push(p);
                  else entry.main.push(p);
                  return map;
                }, new Map())
              ).map(([sid, { name, main, reg }]) => (
                <li key={sid} className="bg-white rounded-xl border border-green-100 overflow-hidden">
                  <div className="px-3 py-2 bg-green-50 border-b border-green-100 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-extrabold text-green-800 shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-slate-800">{name}</span>
                    {(() => {
                      const st = students.find((s) => s.id === sid);
                      if (!st?.classGroup) return null;
                      const groups = LOCATION_CLASS_GROUPS[st.location] || [];
                      const label  = groups.find((g) => g.id === st.classGroup)?.label;
                      return label ? <span className="badge bg-violet-100 text-violet-700 text-xs ml-1">{label}</span> : null;
                    })()}
                    {!regPaidIds.has(sid) && (
                      <span className="badge bg-orange-100 text-orange-700 text-xs ml-1 inline-flex items-center gap-0.5">
                        <ClipboardList size={9} /> Reg unpaid
                      </span>
                    )}
                  </div>
                  <ul className="divide-y divide-green-50">
                    {main.map((p) => <PaidRow key={p.id} p={p} onDeleted={loadPayments} />)}
                    {reg.map((p) => (
                      <PaidRow key={p.id} p={p} onDeleted={loadPayments} />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

    </section>
  );
}
