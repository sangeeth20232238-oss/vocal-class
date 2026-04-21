// src/firestoreService.js
import {
  collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export const parseFirebaseError = (err, fallback) => {
  if (err?.code === "permission-denied") return "System maintenance required (Permissions)";
  if (err?.code === "unavailable" || err?.message?.toLowerCase().includes("network")) return "Internet connection error. Please check your network.";
  return fallback || "An unexpected error occurred.";
};

// ── Students ──────────────────────────────────────────────────────────────────
export const addStudent = (name, phone, location) =>
  addDoc(collection(db, "students"), { name, phone, location, createdAt: serverTimestamp() });

export const getStudents = async () => {
  const snap = await getDocs(collection(db, "students"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const deleteStudent = (id) => deleteDoc(doc(db, "students", id));

export const updateStudent = (id, data) =>
  setDoc(doc(db, "students", id), data, { merge: true });

// ── Attendance ────────────────────────────────────────────────────────────────
export const setAttendance = (studentId, date, status, location) =>
  setDoc(doc(db, "attendance", `${studentId}_${date}`), {
    studentId, date, status, location, updatedAt: serverTimestamp(),
  });

export const getAttendanceForDate = async (date) => {
  const q = query(collection(db, "attendance"), where("date", "==", date));
  const snap = await getDocs(q);
  return Object.fromEntries(snap.docs.map((d) => [d.data().studentId, d.data().status]));
};

export const getAttendanceForMonth = async (monthPrefix) => {
  const snap = await getDocs(collection(db, "attendance"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.date && r.date.startsWith(monthPrefix));
};

export const getAttendanceForStudent = async (studentId) => {
  const q = query(collection(db, "attendance"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── Payments ──────────────────────────────────────────────────────────────────
// paymentType: "monthly" | "term" | "scholarship"
export const recordPayment = (studentId, studentName, month, amount, location, paymentType = "monthly", deduction = 0) =>
  addDoc(collection(db, "payments"), {
    studentId, studentName, month, amount: Number(amount), location,
    paymentType, deduction: Number(deduction), paidAt: serverTimestamp(),
  });

export const getPayments = async () => {
  const snap = await getDocs(collection(db, "payments"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── Progress Notes ────────────────────────────────────────────────────────────
// docId = studentId_YYYY-MM-WW  (WW = week number within month, 1-based)
export const saveProgressNote = (studentId, studentName, location, yearMonth, weekNum, note) =>
  setDoc(doc(db, "progress", `${studentId}_${yearMonth}_W${weekNum}`), {
    studentId, studentName, location, yearMonth, weekNum, note,
    updatedAt: serverTimestamp(),
  });

export const getProgressForStudent = async (studentId) => {
  const q = query(collection(db, "progress"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getProgressForMonth = async (yearMonth) => {
  const q = query(collection(db, "progress"), where("yearMonth", "==", yearMonth));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
