// src/components/StudentDirectory.jsx
import { useState } from "react";
import { UserPlus, Users, Search, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { addStudent, deleteStudent } from "../firestoreService";
import StudentProfile from "./StudentProfile";

export default function StudentDirectory({ students, onStudentAdded, locations, activeLocation }) {
  const [name, setName]             = useState("");
  const [phone, setPhone]           = useState("");
  const [location, setLocation]     = useState(locations[0] || "");
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState("");
  const [profileStudent, setProfileStudent] = useState(null);

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("Please enter the student's name before saving."); return; }
    if (!location)    { toast.error("Please select a location for this student."); return; }
    if (phone && !/^\+?[\d\s\-()]{7,15}$/.test(phone.trim())) {
      toast.error("That phone number doesn't look right. Please check it.");
      return;
    }
    setSaving(true);
    try {
      await addStudent(name.trim(), phone.trim(), location);
      toast.success(`${name.trim()} added to ${location}!`);
      setName(""); setPhone("");
      onStudentAdded();
    } catch {
      toast.error("Could not save. Please check your internet connection.");
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
    <section className="space-y-4 sm:space-y-6">

      {/* Add Student Form */}
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-4 sm:p-6 border border-blue-100">
        <h2 className="text-lg sm:text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2">
          <UserPlus size={22} /> Add New Student
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm sm:text-base font-semibold text-blue-900 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nimal Perera"
              className="w-full border-2 border-blue-300 rounded-xl px-3 py-2.5 text-sm sm:text-base focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label className="block text-sm sm:text-base font-semibold text-blue-900 mb-1">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0771234567"
              className="w-full border-2 border-blue-300 rounded-xl px-3 py-2.5 text-sm sm:text-base focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label className="block text-sm sm:text-base font-semibold text-blue-900 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full border-2 border-blue-300 rounded-xl px-3 py-2.5 text-sm sm:text-base focus:outline-none focus:border-blue-600 bg-white">
              {locations.filter((l) => l !== "All").map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving}
          className="mt-4 w-full sm:w-auto bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm sm:text-base font-bold px-6 py-3 rounded-xl transition-colors">
          {saving ? "Saving…" : "Save Student"}
        </button>
      </div>

      {/* Student List */}
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-4 sm:p-6 border border-blue-100">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-lg sm:text-2xl font-bold text-blue-800 flex items-center gap-2">
            <Users size={22} />
            {activeLocation === "All" ? "All Students" : activeLocation}
            <span className="text-sm font-semibold text-blue-400">({filtered.length})</span>
          </h2>
          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full sm:w-52 border-2 border-blue-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">{search ? "🔍" : "🎤"}</div>
            <p className="text-blue-400 text-sm">
              {search ? `No students match "${search}"` : "No students here yet. Add one above!"}
            </p>
          </div>
        ) : grouped ? (
          Object.entries(grouped).map(([loc, group]) => (
            <div key={loc} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                  {loc} &middot; {group.length}
                </span>
              </div>
              <ul className="divide-y divide-blue-100">
                {group.map((s) => <StudentRow key={s.id} student={s} showLocation={false} onDelete={onStudentAdded} onView={setProfileStudent} />)}
              </ul>
            </div>
          ))
        ) : (
          <ul className="divide-y divide-blue-100">
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
    setDeleting(true);
    try {
      await deleteStudent(student.id);
      toast.success(`${student.name} has been removed.`);
      onDelete();
    } catch {
      toast.error("Could not delete. Please try again.");
    } finally { setDeleting(false); setConfirming(false); }
  };

  return (
    <li className="py-3 flex justify-between items-center gap-2 hover:bg-blue-50/50 rounded-xl px-2 transition-colors">
      <div className="min-w-0">
        <span className="text-sm sm:text-base font-semibold text-blue-900 block truncate">{student.name}</span>
        {showLocation && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{student.location}</span>
        )}
        {student.phone && <span className="text-xs text-blue-400 block">{student.phone}</span>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onView(student)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border border-blue-200">
          <Eye size={13} /> Profile
        </button>
        {!confirming ? (
          <button onClick={() => setConfirming(true)}
            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-xl transition-colors">
            <Trash2 size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl px-2 py-1">
            <span className="text-xs font-semibold text-red-700 hidden sm:block">Remove?</span>
            <button onClick={handleDelete} disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-60">
              {deleting ? "…" : "Yes"}
            </button>
            <button onClick={() => setConfirming(false)}
              className="text-slate-500 hover:text-slate-700 text-xs font-semibold px-1 py-1">
              No
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
