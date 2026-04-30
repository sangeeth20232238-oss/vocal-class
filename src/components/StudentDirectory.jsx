// src/components/StudentDirectory.jsx
import { useState, useEffect } from "react";
import { UserPlus, Users, Search, Trash2, Eye, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { addStudentWithPayments, deleteStudentCascade, parseFirebaseError, migrateMissingDobGender, migrateClassGroups } from "../firestoreService";
import StudentProfile from "./StudentProfile";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import ConfirmActionModal from "./ConfirmActionModal";
import { LOCATION_CLASS_GROUPS, suggestClassGroup } from "../scheduleConfig";

const GENDERS = ["Female", "Male"];
const FIRST_PAY_TYPES = [
  { id: "monthly",     label: "Monthly Fee",  default: 4500  },
  { id: "term",        label: "Term Fee",      default: 12000 },
  { id: "scholarship", label: "Scholarship",   default: 0     },
];

export default function StudentDirectory({ students, onStudentAdded, locations, activeLocation }) {
  const [name, setName]                     = useState("");
  const [phone, setPhone]                   = useState("");
  const [location, setLocation]             = useState(locations.filter((l) => l !== "All")[0] || "");
  const [dob, setDob]                       = useState("");
  const [gender, setGender]                 = useState("Female");
  const [classGroup, setClassGroup]         = useState("");
  const [regFee, setRegFee]                 = useState("1000");
  const [regDed, setRegDed]                 = useState("0");
  const [firstPayType, setFirstPayType]     = useState("monthly");
  const [firstAmount, setFirstAmount]       = useState("4500");
  const [firstDed, setFirstDed]             = useState("0");
  const [saving, setSaving]                 = useState(false);
  const [showReview, setShowReview]         = useState(false);
  const [search, setSearch]                 = useState("");
  const [profileStudent, setProfileStudent] = useState(null);

  const classGroups = LOCATION_CLASS_GROUPS[location] || [];

  // Auto-suggest class group when DOB or location changes
  useEffect(() => {
    const suggested = suggestClassGroup(location, dob);
    setClassGroup(suggested || "");
  }, [dob, location]);

  const handleFirstTypeChange = (t) => {
    setFirstPayType(t);
    setFirstAmount(String(FIRST_PAY_TYPES.find((x) => x.id === t)?.default ?? 0));
    setFirstDed("0");
  };

  // Run once on mount — fills dob/gender + classGroup for existing students
  useEffect(() => {
    Promise.all([
      migrateMissingDobGender(),
      migrateClassGroups(suggestClassGroup),
    ]).then(([c1, c2]) => { if (c1 + c2 > 0) onStudentAdded(); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = () => {
    // Validate first, then show review modal
    if (!name.trim()) { toast.error("Please enter the student's name."); return; }
    if (!location)    { toast.error("Please select a location."); return; }
    if (!classGroup)  { toast.error("Please select a class group."); return; }
    if (phone && !/^\+?[\d\s\-()]{7,15}$/.test(phone.trim())) {
      toast.error("That phone number doesn't look right."); return;
    }
    const rf = Number(regFee), rd = Number(regDed);
    if (isNaN(rf) || rf < 0)  { toast.error("Invalid registration fee."); return; }
    if (rd < 0 || rd > rf)    { toast.error("Deduction cannot exceed registration fee."); return; }
    const isScholarship = firstPayType === "scholarship";
    const fa = Number(firstAmount), fd = Number(firstDed);
    if (!isScholarship && (isNaN(fa) || fa <= 0)) { toast.error("Enter a valid first-month amount."); return; }
    if (!isScholarship && fd > fa)                { toast.error("First-month deduction cannot exceed amount."); return; }
    setShowReview(true);
  };

  const handleConfirmSave = async () => {
    setShowReview(false);
    const isScholarship = firstPayType === "scholarship";
    const rf = Number(regFee), rd = Number(regDed);
    const fa = Number(firstAmount), fd = Number(firstDed);
    setSaving(true);
    try {
      await addStudentWithPayments({
        name: name.trim(), phone: phone.trim(), location, dob, gender, classGroup,
        regFee: rf, regDed: rd,
        firstPayType, firstAmount: fa, firstDed: fd,
      });
      toast.success(`${name.trim()} enrolled & payments recorded!`);
      setName(""); setPhone(""); setDob(""); setGender("Female"); setClassGroup("");
      setRegFee("1000"); setRegDed("0");
      setFirstPayType("monthly"); setFirstAmount("4500"); setFirstDed("0");
      onStudentAdded();
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not save. Please try again."));
    } finally { setSaving(false); }
  };

  const classGroupLabel = LOCATION_CLASS_GROUPS[location]?.find((g) => g.id === classGroup)?.label || classGroup;
  const isScholarshipReview = firstPayType === "scholarship";
  const regNet   = Math.max(0, Number(regFee) - Number(regDed));
  const firstNet = isScholarshipReview ? 0 : Math.max(0, Number(firstAmount) - Number(firstDed));
  const reviewRows = [
    { label: "Name",            value: name.trim() || "—" },
    { label: "Location",        value: location },
    { label: "Class Group",     value: classGroupLabel || "—" },
    { label: "Phone",           value: phone.trim() || "Not provided" },
    { label: "Date of Birth",   value: dob || "Not provided" },
    { label: "Gender",          value: gender },
    { label: "Reg Fee",         value: `Rs. ${regNet.toLocaleString()}`, highlight: true },
    { label: "First Payment",   value: isScholarshipReview ? "Scholarship (Free)" : `Rs. ${firstNet.toLocaleString()} (${firstPayType})`, highlight: true },
  ];

  const base     = activeLocation === "All" ? students : students.filter((s) => s.location === activeLocation);
  const filtered = search.trim()
    ? base.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search))
    : base;

  // Group by location (All view) then by class group within each location
  const buildGrouped = (studentList, loc) => {
    const groups = LOCATION_CLASS_GROUPS[loc] || [];
    const unknown = studentList.filter((s) => !groups.find((g) => g.id === s.classGroup));
    const result = groups
      .map((g) => ({ label: g.label, id: g.id, students: studentList.filter((s) => s.classGroup === g.id) }))
      .filter((g) => g.students.length > 0);
    if (unknown.length > 0) result.push({ label: "Unassigned", id: "unknown", students: unknown });
    return result;
  };

  return (
    <section className="space-y-5">

      {/* Add Student Form */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="section-header">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}>
            <UserPlus size={17} className="text-white" />
          </div>
          Add New Student
        </div>

        {/* Row 1: Name, Phone, Location */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0771234567" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Location <span className="text-red-500">*</span>
            </label>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className="input-field">
              {locations.filter((l) => l !== "All").map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: DOB + Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split("T")[0]} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-field">
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3: Class Group */}
        <div className="mt-3 p-3 rounded-xl border border-violet-100 bg-violet-50/60">
          <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">
            Class Group <span className="text-red-500">*</span>
            {dob && classGroup && <span className="ml-2 font-normal text-violet-500 normal-case">— auto-suggested from date of birth</span>}
          </p>
          {classGroups.length === 0 ? (
            <p className="text-xs text-slate-400">Select a location first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classGroups.map((g) => (
                <button key={g.id} type="button" onClick={() => setClassGroup(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                    classGroup === g.id
                      ? "bg-violet-700 border-violet-700 text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:border-violet-400"
                  }`}>
                  {g.label}
                </button>
              ))}
            </div>
          )}
          {!classGroup && classGroups.length > 0 && (
            <p className="text-xs text-amber-600 font-semibold mt-2">Please select a class group above.</p>
          )}
        </div>

        {/* Row 4: Registration Fee */}
        <div className="mt-3 p-3 rounded-xl border border-blue-100 bg-blue-50/60">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Registration Fee (one-time)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Fee (Rs.)</label>
              <input type="number" value={regFee} onChange={(e) => setRegFee(e.target.value)}
                min="0" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Deduction (Rs.)</label>
              <input type="number" value={regDed} onChange={(e) => setRegDed(e.target.value)}
                min="0" placeholder="0" className="input-field" />
            </div>
          </div>
          {Number(regDed) > 0 && (
            <p className="text-xs font-semibold text-blue-700 mt-2">
              Net registration: Rs. {Math.max(0, Number(regFee) - Number(regDed)).toLocaleString()}
            </p>
          )}
          {Number(regFee) === 0 && (
            <p className="text-xs font-semibold text-purple-600 mt-2">No registration fee charged</p>
          )}
        </div>

        {/* Row 5: First Month Payment */}
        <div className="mt-3 p-3 rounded-xl border border-green-100 bg-green-50/60">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">First Month Payment</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {FIRST_PAY_TYPES.map((t) => (
              <button key={t.id} type="button" onClick={() => handleFirstTypeChange(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  firstPayType === t.id
                    ? "bg-green-700 border-green-700 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-green-400"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          {firstPayType === "scholarship" ? (
            <p className="text-xs font-semibold text-purple-600">Scholarship — Rs. 0 (fully covered)</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Amount (Rs.)</label>
                <input type="number" value={firstAmount} onChange={(e) => setFirstAmount(e.target.value)}
                  min="1" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Deduction (Rs.)</label>
                <input type="number" value={firstDed} onChange={(e) => setFirstDed(e.target.value)}
                  min="0" placeholder="0" className="input-field" />
              </div>
            </div>
          )}
          {firstPayType !== "scholarship" && Number(firstDed) > 0 && (
            <p className="text-xs font-semibold text-green-700 mt-2">
              Net: Rs. {Math.max(0, Number(firstAmount) - Number(firstDed)).toLocaleString()}
            </p>
          )}
        </div>

        <button onClick={handleAdd} disabled={saving} className="btn-primary mt-4 text-sm">
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
            : <><UserPlus size={15} />Enrol Student</>
          }
        </button>
      </div>

      {showReview && (
        <ConfirmActionModal
          title="Review Enrolment"
          rows={reviewRows}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowReview(false)}
          confirmLabel="Confirm Enrolment"
          confirmClass="bg-blue-700 hover:bg-blue-800"
        />
      )}

      {/* Student List */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="section-header mb-0">
            <Users size={18} className="text-blue-600" />
            {activeLocation === "All" ? "All Students" : activeLocation}
            <span className="badge bg-blue-100 text-blue-700 ml-1">{filtered.length}</span>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className="input-field !pl-9 !py-2 text-sm w-full sm:w-52" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
              {search ? <Search size={28} className="text-blue-300" /> : <Users size={28} className="text-blue-300" />}
            </div>
            <p className="text-slate-400 text-sm font-medium">
              {search ? `No students match "${search}"` : "No students here yet. Add one above!"}
            </p>
          </div>
        ) : activeLocation === "All" ? (
          // All locations view: group by location then by class
          locations.filter((l) => l !== "All").map((loc) => {
            const locStudents = filtered.filter((s) => s.location === loc);
            if (locStudents.length === 0) return null;
            const classGrouped = buildGrouped(locStudents, loc);
            return (
              <div key={loc} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge bg-blue-100 text-blue-700 text-sm font-bold">
                    <MapPin size={11} /> {loc} · {locStudents.length}
                  </span>
                </div>
                {classGrouped.map((cg) => (
                  <div key={cg.id} className="mb-3">
                    <ClassGroupHeader label={cg.label} count={cg.students.length} />
                    <ul className="divide-y divide-slate-100">
                      {cg.students.map((s) => <StudentRow key={s.id} student={s} showLocation={false} onDelete={onStudentAdded} onView={setProfileStudent} />)}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })
        ) : (
          // Single location view: group by class only
          buildGrouped(filtered, activeLocation).map((cg) => (
            <div key={cg.id} className="mb-4">
              <ClassGroupHeader label={cg.label} count={cg.students.length} />
              <ul className="divide-y divide-slate-100">
                {cg.students.map((s) => <StudentRow key={s.id} student={s} showLocation={false} onDelete={onStudentAdded} onView={setProfileStudent} />)}
              </ul>
            </div>
          ))
        )}
      </div>

      {profileStudent && (
        <StudentProfile
          student={profileStudent}
          onClose={() => setProfileStudent(null)}
          onUpdated={() => { onStudentAdded(); setProfileStudent(null); }}
        />
      )}
    </section>
  );
}

function ClassGroupHeader({ label, count }) {
  return (
    <div className="flex items-center gap-2 mb-1.5 px-1">
      <div className="h-px flex-1 bg-violet-100" />
      <span className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full whitespace-nowrap">
        {label} · {count} student{count !== 1 ? "s" : ""}
      </span>
      <div className="h-px flex-1 bg-violet-100" />
    </div>
  );
}

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function StudentRow({ student, showLocation, onDelete, onView }) {
  const [showModal, setShowModal] = useState(false);
  const age = calcAge(student.dob);

  const handleDelete = async () => {
    try {
      await deleteStudentCascade(student.id);
      toast.success(`${student.name} permanently deleted.`);
      onDelete();
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not delete. Please try again."));
    }
  };

  return (
    <li className="py-3 flex justify-between items-center gap-2 hover:bg-slate-50 rounded-xl px-2 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0"
          style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}>
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-800 block truncate">{student.name}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {showLocation && (
              <span className="badge bg-blue-100 text-blue-700"><MapPin size={9} />{student.location}</span>
            )}
            {student.phone && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Phone size={10} />{student.phone}
              </span>
            )}
            {student.gender && student.gender !== "Not specified" && (
              <span className="text-xs text-slate-400">{student.gender}</span>
            )}
            {age !== null && <span className="text-xs text-slate-400">{age} yrs</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onView(student)} className="btn-ghost text-xs py-1.5 px-2.5">
          <Eye size={13} /> Profile
        </button>
        <button onClick={() => setShowModal(true)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>

      {showModal && (
        <ConfirmDeleteModal
          name={student.name}
          onConfirm={handleDelete}
          onCancel={() => setShowModal(false)}
        />
      )}
    </li>
  );
}
