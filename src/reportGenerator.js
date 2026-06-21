// src/reportGenerator.js
import * as XLSX from "xlsx";
import { getScheduledDates, LOCATION_CLASS_GROUPS } from "./scheduleConfig";
import { getCoveredStudentIds } from "./firestoreService";

const fmtDate = (ts) => {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-LK", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const monthLabel = (m) =>
  new Date(m + "-01").toLocaleDateString("en-LK", { month: "long", year: "numeric" });

const payTypeLabel = (t) => {
  if (t === "term" || t === "annual") return "Term Fee";
  if (t === "scholarship") return "Scholarship (Free)";
  if (t === "registration") return "Registration Fee";
  return "Monthly";
};

const getClassGroupLabel = (location, groupId) => {
  if (!groupId || groupId === "unknown") return "Unassigned";
  const groups = LOCATION_CLASS_GROUPS[location] || [];
  return groups.find((g) => g.id === groupId)?.label || groupId;
};

const sortByClassGroup = (studentList, location) => {
  const groups = LOCATION_CLASS_GROUPS[location] || [];
  return [...studentList].sort((a, b) => {
    const ai = groups.findIndex((g) => g.id === a.classGroup);
    const bi = groups.findIndex((g) => g.id === b.classGroup);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
};

export function generateMonthlyReport(month, students, attendanceData, payments, locations, progressNotes = []) {
  const wb = XLSX.utils.book_new();
  const today = new Date().toISOString().split("T")[0];

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  const summaryRows = [
    ["VOCAL CLASS MONTHLY REPORT"],
    [`Month: ${monthLabel(month)}`],
    [`Generated: ${new Date().toLocaleDateString("en-LK", { day: "numeric", month: "long", year: "numeric" })}`],
    [],
    ["Location", "Class Group", "Students", "Classes Held", "Present", "Absent",
     "Monthly (Rs.)", "Term (Rs.)", "Reg Fees (Rs.)", "Scholarships", "Total Collected (Rs.)", "Pending"],
  ];

  let grandTotal = 0;

  locations.forEach((loc) => {
    const locStudents      = students.filter((s) => s.location === loc);
    const allLocPayments   = payments.filter((p) => p.location === loc); // all-time for term window
    const monthLocPayments = allLocPayments.filter((p) => p.month === month);
    const scheduledDates   = getScheduledDates(loc, month);
    const passedDates      = scheduledDates.filter((d) => d <= today);
    const locGroups        = LOCATION_CLASS_GROUPS[loc] || [];

    const groupsToShow = locGroups.length > 0 ? locGroups : [{ id: "", label: "All" }];
    groupsToShow.forEach((g) => {
      const groupStudents = g.id
        ? locStudents.filter((s) => s.classGroup === g.id)
        : locStudents;
      if (groupStudents.length === 0) return;

      let totalPresent = 0, totalAbsent = 0;
      groupStudents.forEach((s) => {
        passedDates.forEach((date) => {
          const rec = attendanceData.find((r) => r.studentId === s.id && r.date === date);
          if (rec?.status === "present") totalPresent++;
          else totalAbsent++;
        });
      });

      const groupIds      = new Set(groupStudents.map((s) => s.id));
      // Use month-only payments for fee totals (what was collected this month)
      const groupMonthPay = monthLocPayments.filter((p) => groupIds.has(p.studentId));
      const monthlyFees   = groupMonthPay.filter((p) => p.paymentType === "monthly").reduce((s, p) => s + Number(p.amount), 0);
      const termFees      = groupMonthPay.filter((p) => p.paymentType === "term" || p.paymentType === "annual").reduce((s, p) => s + Number(p.amount), 0);
      const regFees       = groupMonthPay.filter((p) => p.paymentType === "registration").reduce((s, p) => s + Number(p.amount), 0);
      const scholarCount  = groupMonthPay.filter((p) => p.paymentType === "scholarship").length;
      const totalCollected = monthlyFees + termFees + regFees;

      // Use all-time payments for coverage (term window spans 3 months)
      const groupAllPay   = allLocPayments.filter((p) => groupIds.has(p.studentId));
      const coveredIds    = getCoveredStudentIds(groupAllPay, month);
      const pendingCount  = groupStudents.filter((s) => !coveredIds.has(s.id)).length;

      grandTotal += totalCollected;

      summaryRows.push([
        loc, g.label, groupStudents.length, passedDates.length, totalPresent, totalAbsent,
        monthlyFees, termFees, regFees, scholarCount, totalCollected, pendingCount,
      ]);
    });
  });

  summaryRows.push([]);
  summaryRows.push(["", "", "", "", "", "", "", "", "", "", "GRAND TOTAL (Rs.)", grandTotal]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [14, 16, 10, 13, 10, 10, 15, 14, 15, 13, 20, 10].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ── Per location: Attendance sheet ───────────────────────────────────────
  locations.forEach((loc) => {
    const locStudents    = students.filter((s) => s.location === loc);
    const scheduledDates = getScheduledDates(loc, month);
    const passedDates    = scheduledDates.filter((d) => d <= today);

    if (locStudents.length === 0) return;

    const dateHeaders = passedDates.map((d) => {
      const day = new Date(d + "T00:00:00");
      return `${day.getDate()} ${day.toLocaleDateString("en-LK", { weekday: "short" })}`;
    });

    const attRows = [
      [`${loc} — Attendance — ${monthLabel(month)}`],
      [],
      ["Class Group", "Student Name", "Phone", ...dateHeaders, "Present", "Absent", "Rate %"],
    ];

    sortByClassGroup(locStudents, loc).forEach((s) => {
      const statuses = passedDates.map((date) => {
        const rec = attendanceData.find((r) => r.studentId === s.id && r.date === date);
        return rec?.status === "present" ? "P" : rec?.status === "absent" ? "A" : "—";
      });
      const presentCount = statuses.filter((x) => x === "P").length;
      const absentCount  = statuses.filter((x) => x === "A").length;
      const rate         = passedDates.length > 0 ? Math.round((presentCount / passedDates.length) * 100) : 0;
      attRows.push([getClassGroupLabel(loc, s.classGroup), s.name, s.phone || "—", ...statuses, presentCount, absentCount, `${rate}%`]);
    });

    const wsAtt = XLSX.utils.aoa_to_sheet(attRows);
    wsAtt["!cols"] = [16, 22, 14, ...dateHeaders.map(() => 6), 10, 8, 8].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsAtt, `${loc} Attendance`);
  });

  // ── Per location: Payments sheet ─────────────────────────────────────────
  locations.forEach((loc) => {
    const locStudents      = students.filter((s) => s.location === loc);
    const allLocPayments   = payments.filter((p) => p.location === loc);
    const monthLocPayments = allLocPayments.filter((p) => p.month === month);

    const payRows = [
      [`${loc} — Payments — ${monthLabel(month)}`],
      [],
      ["Class Group", "Student Name", "Payment Type", "Amount (Rs.)", "Deduction (Rs.)", "Net Paid (Rs.)", "Date Paid"],
    ];

    const sortedPayments = [...monthLocPayments].sort((a, b) => {
      const as = students.find((s) => s.id === a.studentId);
      const bs = students.find((s) => s.id === b.studentId);
      const groups = LOCATION_CLASS_GROUPS[loc] || [];
      const ai = groups.findIndex((g) => g.id === as?.classGroup);
      const bi = groups.findIndex((g) => g.id === bs?.classGroup);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    sortedPayments.forEach((p) => {
      const isScholar = p.paymentType === "scholarship";
      const pStudent  = students.find((s) => s.id === p.studentId);
      payRows.push([
        getClassGroupLabel(loc, pStudent?.classGroup),
        p.studentName,
        payTypeLabel(p.paymentType),
        isScholar ? "FREE" : Number(p.amount) + Number(p.deduction || 0),
        isScholar ? 0 : Number(p.deduction || 0),
        isScholar ? "Scholarship" : Number(p.amount),
        fmtDate(p.paidAt),
      ]);
    });

    const total = monthLocPayments.filter((p) => p.paymentType !== "scholarship").reduce((s, p) => s + Number(p.amount), 0);
    payRows.push([]);
    payRows.push(["TOTAL COLLECTED (excl. scholarships)", "", "", "", "", total, ""]);

    // Term-aware pending: use all-time payments so 3-month window works
    const coveredIds = getCoveredStudentIds(allLocPayments, month);
    const pending    = sortByClassGroup(locStudents.filter((s) => !coveredIds.has(s.id)), loc);
    if (pending.length > 0) {
      payRows.push([]);
      payRows.push(["PENDING STUDENTS (not covered this month)"]);
      pending.forEach((s) => payRows.push([getClassGroupLabel(loc, s.classGroup), s.name, "Not covered", "", "", "", ""]));
    }

    const wsPay = XLSX.utils.aoa_to_sheet(payRows);
    wsPay["!cols"] = [16, 24, 20, 16, 16, 18, 16].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsPay, `${loc} Payments`);
  });

  // ── Per location: Progress Notes sheet ───────────────────────────────────
  locations.forEach((loc) => {
    const locStudents    = students.filter((s) => s.location === loc);
    const scheduledDates = getScheduledDates(loc, month);

    if (locStudents.length === 0 || scheduledDates.length === 0) return;

    const weekHeaders = scheduledDates.map((d, i) => {
      const day = new Date(d + "T00:00:00");
      return `Week ${i + 1} (${day.getDate()} ${day.toLocaleDateString("en-LK", { weekday: "short" })})`;
    });

    const progRows = [
      [`${loc} — Progress Notes — ${monthLabel(month)}`],
      [],
      ["Class Group", "Student Name", "Phone", ...weekHeaders],
    ];

    sortByClassGroup(locStudents, loc).forEach((s) => {
      const weekNotes = scheduledDates.map((_, i) => {
        const rec = progressNotes.find((n) => n.studentId === s.id && n.yearMonth === month && n.weekNum === i + 1);
        return rec?.note || "";
      });
      progRows.push([getClassGroupLabel(loc, s.classGroup), s.name, s.phone || "—", ...weekNotes]);
    });

    const wsProg = XLSX.utils.aoa_to_sheet(progRows);
    wsProg["!cols"] = [16, 22, 14, ...weekHeaders.map(() => 35)].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsProg, `${loc} Progress`);
  });

  return XLSX.write(wb, { bookType: "xlsx", type: "base64" });
}

export function generateEmailSummary(month, students, attendanceData, payments, locations) {
  const today = new Date().toISOString().split("T")[0];
  let body = `MONTHLY REPORT — ${monthLabel(month)}\n`;
  body += `Generated on ${new Date().toLocaleDateString("en-LK", { day: "numeric", month: "long", year: "numeric" })}\n\n`;

  let grandTotal = 0;

  locations.forEach((loc) => {
    const locStudents      = students.filter((s) => s.location === loc);
    const allLocPayments   = payments.filter((p) => p.location === loc);
    const monthLocPayments = allLocPayments.filter((p) => p.month === month);
    const scheduledDates   = getScheduledDates(loc, month);
    const passedDates      = scheduledDates.filter((d) => d <= today);
    const totalCollected   = monthLocPayments.filter((p) => p.paymentType !== "scholarship").reduce((s, p) => s + Number(p.amount), 0);
    const scholarCount     = monthLocPayments.filter((p) => p.paymentType === "scholarship").length;
    const coveredIds       = getCoveredStudentIds(allLocPayments, month);
    const pendingNames     = locStudents.filter((s) => !coveredIds.has(s.id)).map((s) => s.name);

    grandTotal += totalCollected;

    body += `${loc} (${locStudents.length} students | ${passedDates.length} classes held)\n`;

    const locGroups = LOCATION_CLASS_GROUPS[loc] || [];
    locGroups.forEach((g) => {
      const gStudents = locStudents.filter((s) => s.classGroup === g.id);
      if (gStudents.length === 0) return;
      const gPaid    = gStudents.filter((s) => coveredIds.has(s.id)).length;
      const gPending = gStudents.length - gPaid;
      body += `   ${g.label}: ${gStudents.length} students`;
      body += gPending > 0 ? ` — ${gPending} pending\n` : ` — all paid ✓\n`;
    });

    body += `   Collected: Rs. ${totalCollected.toLocaleString()}`;
    if (scholarCount > 0) body += ` | Scholarships: ${scholarCount}`;
    body += `\n`;
    body += pendingNames.length > 0
      ? `   Pending: ${pendingNames.join(", ")}\n`
      : `   Pending: None — everyone paid!\n`;
    body += "\n";
  });

  body += `GRAND TOTAL COLLECTED: Rs. ${grandTotal.toLocaleString()}\n`;
  body += `\nFull details (attendance, payments, progress notes) are in the attached Excel file.\n`;
  body += `\n— Sent from Aunty Adele's Vocal Class Manager`;

  return body;
}
