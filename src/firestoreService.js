// src/firestoreService.js
import {
  collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, where, serverTimestamp, writeBatch
} from "firebase/firestore";
import { db } from "./firebase";

export const parseFirebaseError = (err, fallback) => {
  if (err?.code === "permission-denied") return "System maintenance required (Permissions)";
  if (err?.code === "unavailable" || err?.message?.toLowerCase().includes("network")) return "Internet connection error. Please check your network.";
  return fallback || "An unexpected error occurred.";
};

// ── Students ──────────────────────────────────────────────────────────────────
export const addStudent = (name, phone, location, dob = "", gender = "", registrationFee = 1000, registrationDeduction = 0, classGroup = "") =>
  addDoc(collection(db, "students"), { name, phone, location, dob, gender, classGroup, registrationFee: Number(registrationFee), registrationDeduction: Number(registrationDeduction), createdAt: serverTimestamp() });

// One-time migration: fills dummy dob/gender for students that don't have them yet
export const migrateMissingDobGender = async () => {
  const snap = await getDocs(collection(db, "students"));
  const batch = writeBatch(db);
  let count = 0;
  snap.docs.forEach((d) => {
    const data = d.data();
    if (!data.dob || !data.gender) {
      batch.set(doc(db, "students", d.id), {
        dob:    data.dob    || "2000-01-01",
        gender: data.gender || "Female",
      }, { merge: true });
      count++;
    }
  });
  if (count > 0) await batch.commit();
  return count;
};

// Migration: assigns classGroup to existing students who don't have one yet.
// Uses DOB to auto-suggest; falls back to "unknown" so Aunty can fix manually.
export const migrateClassGroups = async (suggestFn) => {
  const snap = await getDocs(collection(db, "students"));
  const batch = writeBatch(db);
  let count = 0;
  snap.docs.forEach((d) => {
    const data = d.data();
    if (!data.classGroup) {
      const suggested = suggestFn(data.location, data.dob) || "unknown";
      batch.set(doc(db, "students", d.id), { classGroup: suggested }, { merge: true });
      count++;
    }
  });
  if (count > 0) await batch.commit();
  return count;
};

export const getStudents = async () => {
  const snap = await getDocs(collection(db, "students"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const deleteStudentCascade = async (studentId) => {
  const batch = writeBatch(db);

  // 1. Reference the student document
  const studentRef = doc(db, "students", studentId);
  batch.delete(studentRef);

  // 2. Find and delete docs in other collections
  const collectionsToClear = ["attendance", "payments", "progress"];
  
  for (const collectionName of collectionsToClear) {
    const q = query(collection(db, collectionName), where("studentId", "==", studentId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((document) => {
      batch.delete(document.ref);
    });
  }

  // 3. Commit the batch to the cloud
  await batch.commit();
};

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
// paymentType: "monthly" | "term" | "scholarship" | "registration"
export const recordPayment = (studentId, studentName, month, amount, location, paymentType = "monthly", deduction = 0) =>
  addDoc(collection(db, "payments"), {
    studentId, studentName, month, amount: Number(amount), location,
    paymentType, deduction: Number(deduction), paidAt: serverTimestamp(),
  });

// Called on new student registration — writes student doc + reg payment + first-month payment atomically
export const addStudentWithPayments = async ({
  name, phone, location, dob, gender, classGroup,
  regFee, regDed,
  firstPayType, firstAmount, firstDed,
}) => {
  const batch = writeBatch(db);
  const month = new Date().toISOString().slice(0, 7);

  // 1. Student document
  const studentRef = doc(collection(db, "students"));
  batch.set(studentRef, {
    name, phone, location, dob, gender, classGroup: classGroup || "",
    registrationFee: Number(regFee),
    registrationDeduction: Number(regDed),
    createdAt: serverTimestamp(),
  });

  // 2. Registration payment (always, even if Rs.0)
  const regNet = Math.max(0, Number(regFee) - Number(regDed));
  batch.set(doc(collection(db, "payments")), {
    studentId: studentRef.id, studentName: name, month, location,
    paymentType: "registration", amount: regNet, deduction: Number(regDed),
    paidAt: serverTimestamp(),
  });

  // 3. First-month payment
  const isScholarship = firstPayType === "scholarship";
  const firstNet = isScholarship ? 0 : Math.max(0, Number(firstAmount) - Number(firstDed));
  batch.set(doc(collection(db, "payments")), {
    studentId: studentRef.id, studentName: name, month, location,
    paymentType: firstPayType, amount: firstNet, deduction: isScholarship ? 0 : Number(firstDed),
    paidAt: serverTimestamp(),
  });

  await batch.commit();
  return studentRef.id;
};

export const updatePayment = (id, data) =>
  setDoc(doc(db, "payments", id), data, { merge: true });

export const deletePayment = (id) => deleteDoc(doc(db, "payments", id));

export const getPayments = async () => {
  const snap = await getDocs(collection(db, "payments"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Returns Set of studentIds who have a registration payment recorded (any month)
export const getRegisteredStudentIds = async () => {
  const snap = await getDocs(query(collection(db, "payments"), where("paymentType", "==", "registration")));
  return new Set(snap.docs.map((d) => d.data().studentId));
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
