// src/components/MonthlyReportButton.jsx
import { useState } from "react";
import { Send, FileSpreadsheet, X, CheckCircle } from "lucide-react";
import emailjs from "@emailjs/browser";
import toast from "react-hot-toast";
import { generateMonthlyReport, generateEmailSummary } from "../reportGenerator";
import { getAttendanceForMonth, getPayments } from "../firestoreService";

const EMAILJS_SERVICE_ID  = "service_ettqbku";
const EMAILJS_TEMPLATE_ID = "template_hi73tl8";
const EMAILJS_PUBLIC_KEY  = "rw0wpKL1JcGxqm1WH";
const REPORT_EMAIL        = "enochmessi3@gmail.com";

const monthLabel = (m) =>
  new Date(m + "-01").toLocaleDateString("en-LK", { month: "long", year: "numeric" });

export default function MonthlyReportButton({ month, students, locations }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const [att, pay] = await Promise.all([getAttendanceForMonth(month), getPayments()]);
      const summary = generateEmailSummary(month, students, att, pay, locations);
      setPreview({ att, pay, summary });
      setOpen(true);
    } catch {
      toast.error("Could not load data. Check your connection.");
    } finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const { att, pay, summary } = preview;
      const excelBase64 = generateMonthlyReport(month, students, att, pay, locations);
      const blob = new Blob(
        [Uint8Array.from(atob(excelBase64), (c) => c.charCodeAt(0))],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `Vocal_Class_Report_${month}.xlsx`; link.click();
      URL.revokeObjectURL(url);

      await emailjs.send(
        EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID,
        { to_email: REPORT_EMAIL, subject: `Vocal Class Monthly Report — ${monthLabel(month)}`, message: summary, month: monthLabel(month) },
        EMAILJS_PUBLIC_KEY
      );
      toast.success("Report emailed and Excel downloaded!");
      setOpen(false); setPreview(null);
    } catch (err) {
      console.error(err);
      toast.error("Email failed. Excel was still downloaded.");
    } finally { setLoading(false); }
  };

  const handleDownloadOnly = async () => {
    setLoading(true);
    try {
      const [att, pay] = await Promise.all([getAttendanceForMonth(month), getPayments()]);
      const excelBase64 = generateMonthlyReport(month, students, att, pay, locations);
      const blob = new Blob(
        [Uint8Array.from(atob(excelBase64), (c) => c.charCodeAt(0))],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `Vocal_Class_Report_${month}.xlsx`; link.click();
      URL.revokeObjectURL(url);
      toast.success("Excel report downloaded!");
    } catch {
      toast.error("Could not generate report.");
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* Trigger Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handlePreview}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-colors shadow-md"
        >
          <Send size={16} />
          {loading ? "Preparing…" : "Email Report"}
        </button>
        <button
          onClick={handleDownloadOnly}
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-colors shadow-md"
        >
          <FileSpreadsheet size={16} />
          {loading ? "…" : "Download Excel"}
        </button>
      </div>

      {/* Preview Modal */}
      {open && preview && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-blue-950/70 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 sm:rounded-t-3xl rounded-t-3xl px-5 py-4 text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-extrabold flex items-center gap-2">
                  <Send size={18} /> Send Monthly Report
                </h3>
                <p className="text-indigo-200 text-xs mt-0.5">{monthLabel(month)}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1 rounded-xl hover:bg-white/10">
                <X size={22} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <CheckCircle size={18} className="text-blue-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-blue-700">Sending to</div>
                  <div className="text-sm font-bold text-blue-900">{REPORT_EMAIL}</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <div className="text-xs font-bold text-slate-600 mb-2">Report includes:</div>
                <ul className="space-y-1 text-xs text-slate-700">
                  <li>Summary sheet — all cities, totals, pending</li>
                  {locations.map((loc) => (
                    <li key={loc}>{loc} — Attendance + Payments sheet</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-600 mb-2">Email preview:</div>
                <pre className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                  {preview.summary}
                </pre>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                <strong>Note:</strong> The Excel file will download to your device automatically.
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  {loading ? "Sending…" : "Send Email + Download"}
                </button>
                <button onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">
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
