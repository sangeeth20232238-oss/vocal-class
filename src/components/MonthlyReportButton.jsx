// src/components/MonthlyReportButton.jsx
import { useState } from "react";
import { Send, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";
import emailjs from "@emailjs/browser";
import toast from "react-hot-toast";
import { generateMonthlyReport, generateEmailSummary } from "../reportGenerator";
import { getAttendanceForMonth, getPayments, getProgressForMonth, parseFirebaseError } from "../firestoreService";

const EMAILJS_SERVICE_ID  = "service_ettqbku";
const EMAILJS_TEMPLATE_ID = "template_hi73tl8";
const EMAILJS_PUBLIC_KEY  = "rw0wpKL1JcGxqm1WH";
const REPORT_EMAIL        = "adelebeling@gmail.com";

const monthLabel = (m) => new Date(m + "-01").toLocaleDateString("en-LK", { month: "long", year: "numeric" });

function downloadExcel(excelBase64, month) {
  const blob = new Blob([Uint8Array.from(atob(excelBase64), (c) => c.charCodeAt(0))],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `Vocal_Class_Report_${month}.xlsx`; link.click();
  URL.revokeObjectURL(url);
}

export default function MonthlyReportButton({ month, students, locations }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const [att, pay, prog] = await Promise.all([getAttendanceForMonth(month), getPayments(), getProgressForMonth(month)]);
      setPreview({ att, pay, prog, summary: generateEmailSummary(month, students, att, pay, locations) });
      setOpen(true);
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not load data."));
    } finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const { att, pay, prog, summary } = preview;
      downloadExcel(generateMonthlyReport(month, students, att, pay, locations, prog), month);
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID,
        { to_email: REPORT_EMAIL, subject: `Vocal Class Monthly Report — ${monthLabel(month)}`, message: summary, month: monthLabel(month) },
        EMAILJS_PUBLIC_KEY);
      toast.success("Report emailed and Excel downloaded!");
      setOpen(false); setPreview(null);
    } catch (err) {
      toast.error(parseFirebaseError(err, "Email failed. Excel was still downloaded."));
    } finally { setLoading(false); }
  };

  const handleDownloadOnly = async () => {
    setLoading(true);
    try {
      const [att, pay, prog] = await Promise.all([getAttendanceForMonth(month), getPayments(), getProgressForMonth(month)]);
      downloadExcel(generateMonthlyReport(month, students, att, pay, locations, prog), month);
      toast.success("Excel report downloaded!");
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not generate report."));
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <button onClick={handlePreview} disabled={loading}
          className="btn-primary text-sm">
          <Send size={15} />
          {loading ? "Preparing…" : "Email Report"}
        </button>
        <button onClick={handleDownloadOnly} disabled={loading}
          className="btn-success text-sm">
          <FileSpreadsheet size={15} />
          {loading ? "…" : "Download Excel"}
        </button>
      </div>

      {open && preview && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}>

            <div className="px-5 py-4 text-white flex items-center justify-between sticky top-0 z-10 sm:rounded-t-2xl rounded-t-2xl"
              style={{ background: "linear-gradient(135deg,#4f46e5,#1d4ed8)" }}>
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2"><Send size={16} /> Send Monthly Report</h3>
                <p className="text-indigo-200 text-xs mt-0.5">{monthLabel(month)}</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <CheckCircle2 size={17} className="text-blue-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-blue-600">Sending to</div>
                  <div className="text-sm font-bold text-blue-900">{REPORT_EMAIL}</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <div className="text-xs font-bold text-slate-600 mb-2">Excel report includes:</div>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li>✅ Summary — all cities, totals, pending</li>
                  {locations.map((loc) => <li key={loc}>📍 {loc} — Attendance + Payments + Progress Notes</li>)}
                </ul>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-600 mb-1.5">Email preview:</div>
                <pre className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs text-slate-600 whitespace-pre-wrap max-h-36 overflow-y-auto font-mono">
                  {preview.summary}
                </pre>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
                <strong>Note:</strong> The Excel file will download to your device automatically.
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={handleSend} disabled={loading}
                  className="btn-primary flex-1 justify-center py-3 text-sm">
                  <Send size={15} />
                  {loading ? "Sending…" : "Send Email + Download"}
                </button>
                <button onClick={() => setOpen(false)}
                  className="btn-ghost px-4 py-3 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
