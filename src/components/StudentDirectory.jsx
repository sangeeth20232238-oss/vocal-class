// src/components/StudentDirectory.jsx
import { useState } from "react";
import { UserPlus, Users, Search, Trash2, Eye, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { addStudent, deleteStudentCascade, parseFirebaseError } from "../firestoreService";
import StudentProfile from "./StudentProfile";

export default function StudentDirectory({ students, onStudentAdded, locations, activeLocation }) {
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [location, setLocation] = useState(locations[0] || "");
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");
  const [profileStudent, setProfileStudent] = useState(null);

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("Please enter the student's name."); return; }
    if (!location)    { toast.error("Please select a location."); return; }
    if (phone && !/^\+?[\d\s\-()]{7,15}$/.test(phone.trim())) {
      toast.error("That phone number doesn't look right."); return;
    }
    setSaving(true);
    try {
      await addStudent(name.trim(), phone.trim(), location);
      toast.success(`${name.trim()} added to ${location}!`);
      setName(""); setPhone("");
      onStudentAdded();
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not save. Please try again."));
    } finally { setSaving(false); }
  };

  const base     = activeLocation === "All" ? students : students.filter((s) => s.location === activeLocation);
  const filtered = search.trim()
    ? base.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search))
    : base;

  const grouped = activeLocation === "All"
    ? locations.filter((l) => l !== "All").reduce((acc, loc) => {
        const group = filtered.filter((s) => s.location === loc);
        if (group.length) acc[loc] = group;
        return acc;
      }, {})
    : null;

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0771234567"
              className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Location <span className="text-red-500">*</span>
            </label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}
              className="input-field">
              {locations.filter((l) => l !== "All").map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleAdd} disabled={saving}
          className="btn-primary mt-4 text-sm">
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
          ) : (
            <><UserPlus size={15} />Save Student</>
          )}
        </button>
      </div>

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
              {search
                ? <Search size={28} className="text-blue-300" />
                : <Users size={28} className="text-blue-300" />}
            </div>
            <p className="text-slate-400 text-sm font-medium">
              {search ? `No students match "${search}"` : "No students here yet. Add one above!"}
            </p>
          </div>
        ) : grouped ? (
          Object.entries(grouped).map(([loc, group]) => (
            <div key={loc} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge bg-blue-100 text-blue-700">
                  <MapPin size={10} /> {loc} · {group.length}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {group.map((s) => <StudentRow key={s.id} student={s} showLocation={false} onDelete={onStudentAdded} onView={setProfileStudent} />)}
              </ul>
            </div>
          ))
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((s) => <StudentRow key={s.id} student={s} showLocation={false} onDelete={onStudentAdded} onView={setProfileStudent} />)}
          </ul>
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

function StudentRow({ student, showLocation, onDelete, onView }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const handleDelete = async () => {
    const isSure = window.confirm(
      `WARNING: You are about to permanently delete ${student.name} AND all of their attendance, payments, and progress records.\n\nAre you absolutely sure? This cannot be undone.`
    );
    if (!isSure) { setConfirming(false); return; }
    setDeleting(true);
    try {
      await deleteStudentCascade(student.id);
      toast.success(`${student.name} and all related records removed.`);
      onDelete();
    } catch (err) {
      toast.error(parseFirebaseError(err, "Could not delete. Please try again."));
    } finally { setDeleting(false); setConfirming(false); }
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
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onView(student)}
          className="btn-ghost text-xs py-1.5 px-2.5">
          <Eye size={13} /> Profile
        </button>
        {!confirming ? (
          <button onClick={() => setConfirming(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={15} />
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl px-2 py-1">
            <span className="text-xs font-semibold text-red-700 hidden sm:block">Remove?</span>
            <button onClick={handleDelete} disabled={deleting}
              className="btn-danger text-xs py-1 px-2">
              {deleting ? "…" : "Yes"}
            </button>
            <button onClick={() => setConfirming(false)}
              className="text-slate-500 hover:text-slate-700 text-xs font-semibold px-1">
              No
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
