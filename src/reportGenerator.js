// src/reportGenerator.js
import * as XLSX from "xlsx";
import { getScheduledDates } from "./scheduleConfig";

const fmtDate = (ts) => {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-LK", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const monthLabel = (m) =>
  new Date(m + "-01").toLocaleDateString("en-LK", { month: "long", year: "numeric" });

export function generateMonthlyReport(month, students, attendanceData, payments, locations) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  const summaryRows = [
    ["VOCAL CLASS MONTHLY REPORT"],
    [`Month: ${monthLabel(month)}`],
    [`Generated: ${new Date().toLocaleDateString("en-LK", { day: "numeric", month: "long", year: "numeric" })}`],
    [],
    ["Location", "Total Students", "Classes Held", "Present (total)", "Absent (total)", "Monthly Fees (Rs.)", "Annual Fees (Rs.)", "Total Collected (Rs.)", "Pending Students"],
  ];

  let grandTotal = 0;

  locations.forEach((loc) => {
    const locStudents   = students.filter((s) => s.location === loc);
    const scheduledDates = getScheduledDates(loc, month);
    const today         = new Date().toISOString().split("T")[0];
    const passedDates   = scheduledDates.filter((d) => d <= today);
    const classesHeld   = passedDates.length;

    let totalPresent = 0, totalAbsent = 0;
    locStudents.forEach((s) => {
      passedDates.forEach((date) => {
        const rec = attendanceData.find((r) => r.studentId === s.id && r.date === date);
        if (rec?.status === "present") totalPresent++;
        else totalAbsent++;
      });
    });

    const locPayments  = payments.filter((p) => p.month === month && p.location === loc);
    const monthlyFees  = locPayments.filter((p) => p.paymentType !== "annual").reduce((s, p) => s + Number(p.amount), 0);
    const annualFees   = locPayments.filter((p) => p.paymentType === "annual").reduce((s, p) => s + Number(p.amount), 0);
    const totalCollected = monthlyFees + annualFees;
    const paidIds      = new Set(locPayments.map((p) => p.studentId));
    const pendingCount = locStudents.filter((s) => !paidIds.has(s.id)).length;

    grandTotal += totalCollected;

    summaryRows.push([
      loc, locStudents.length, classesHeld, totalPresent, totalAbsent,
      monthlyFees, annualFees, totalCollected, pendingCount,
    ]);
  });

  summaryRows.push([]);
  summaryRows.push(["", "", "", "", "", "", "", "GRAND TOTAL (Rs.)", grandTotal]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [20, 16, 14, 16, 14, 20, 18, 22, 18].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ── One sheet per location: Attendance ───────────────────────────────────
  locations.forEach((loc) => {
    const locStudents    = students.filter((s) => s.location === loc);
    const scheduledDates = getScheduledDates(loc, month);
    const today          = new Date().toISOString().split("T")[0];
    const passedDates    = scheduledDates.filter((d) => d <= today);

    if (locStudents.length === 0) return;

    // Header row: Name | Phone | date1 | date2 | ... | Total Present | %
    const dateHeaders = passedDates.map((d) => {
      const day = new Date(d + "T00:00:00");
      return `${day.getDate()} ${day.toLocaleDateString("en-LK", { weekday: "short" })}`;
    });

    const attRows = [
      [`${loc} — Attendance — ${monthLabel(month)}`],
      [],
      ["Student Name", "Phone", ...dateHeaders, "Present", "Absent", "Rate %"],
    ];

    locStudents.forEach((s) => {
      const statuses = passedDates.map((date) => {
        const rec = attendanceData.find((r) => r.studentId === s.id && r.date === date);
        return rec?.status === "present" ? "P" : rec?.status === "absent" ? "A" : "—";
      });
      const presentCount = statuses.filter((x) => x === "P").length;
      const absentCount  = statuses.filter((x) => x === "A").length;
      const rate         = passedDates.length > 0 ? Math.round((presentCount / passedDates.length) * 100) : 0;
      attRows.push([s.name, s.phone || "—", ...statuses, presentCount, absentCount, `${rate}%`]);
    });

    const wsAtt = XLSX.utils.aoa_to_sheet(attRows);
    wsAtt["!cols"] = [22, 14, ...dateHeaders.map(() => ({ wch: 6 })), 10, 8, 8].map((w) =>
      typeof w === "number" ? { wch: w } : w
    );
    XLSX.utils.book_append_sheet(wb, wsAtt, `${loc} Attendance`);
  });

  // ── One sheet per location: Payments ─────────────────────────────────────
  locations.forEach((loc) => {
    const locPayments = payments
      .filter((p) => p.month === month && p.location === loc)
      .sort((a, b) => (b.paidAt?.seconds || 0) - (a.paidAt?.seconds || 0));

    const locStudents = students.filter((s) => s.location === loc);
    const paidIds     = new Set(locPayments.map((p) => p.studentId));
    const pending     = locStudents.filter((s) => !paidIds.has(s.id));

    const payRows = [
      [`${loc} — Payments — ${monthLabel(month)}`],
      [],
      ["Student Name", "Payment Type", "Amount (Rs.)", "Deduction (Rs.)", "Net Paid (Rs.)", "Date Paid"],
    ];

    locPayments.forEach((p) => {
      payRows.push([
        p.studentName,
        p.paymentType === "annual" ? "Annual" : "Monthly",
        Number(p.amount) + Number(p.deduction || 0),
        Number(p.deduction || 0),
        Number(p.amount),
        fmtDate(p.paidAt),
      ]);
    });

    const total = locPayments.reduce((s, p) => s + Number(p.amount), 0);
    payRows.push([]);
    payRows.push(["TOTAL COLLECTED", "", "", "", total, ""]);

    if (pending.length > 0) {
      payRows.push([]);
      payRows.push(["PENDING STUDENTS"]);
      pending.forEach((s) => payRows.push([s.name, "Not paid", "", "", "", ""]));
    }

    const wsPay = XLSX.utils.aoa_to_sheet(payRows);
    wsPay["!cols"] = [22, 14, 16, 16, 14, 16].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsPay, `${loc} Payments`);
  });

  // Return as base64 string for email attachment
  return XLSX.write(wb, { bookType: "xlsx", type: "base64" });
}

// Also export a plain-text summary for the email body
export function generateEmailSummary(month, students, attendanceData, payments, locations) {
  const today = new Date().toISOString().split("T")[0];
  let body = `📊 MONTHLY REPORT — ${monthLabel(month)}\n`;
  body += `Generated on ${new Date().toLocaleDateString("en-LK", { day: "numeric", month: "long", year: "numeric" })}\n\n`;

  let grandTotal = 0;

  locations.forEach((loc) => {
    const locStudents    = students.filter((s) => s.location === loc);
    const scheduledDates = getScheduledDates(loc, month);
    const passedDates    = scheduledDates.filter((d) => d <= today);
    const locPayments    = payments.filter((p) => p.month === month && p.location === loc);
    const totalCollected = locPayments.reduce((s, p) => s + Number(p.amount), 0);
    const paidIds        = new Set(locPayments.map((p) => p.studentId));
    const pendingNames   = locStudents.filter((s) => !paidIds.has(s.id)).map((s) => s.name);

    grandTotal += totalCollected;

    body += `📍 ${loc}\n`;
    body += `   Students: ${locStudents.length} | Classes held: ${passedDates.length}\n`;
    body += `   Collected: Rs. ${totalCollected.toLocaleString()}\n`;
    body += pendingNames.length > 0
      ? `   Pending: ${pendingNames.join(", ")}\n`
      : `   Pending: None — everyone paid! 🎉\n`;
    body += "\n";
  });

  body += `💰 GRAND TOTAL COLLECTED: Rs. ${grandTotal.toLocaleString()}\n`;
  body += `\nFull details are in the attached Excel file.\n`;
  body += `\n— Sent from Aunty Adele's Vocal Class Manager`;

  return body;
}
