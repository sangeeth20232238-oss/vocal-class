// src/App.jsx
import { useState, useEffect, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import { Music4, MapPin, LayoutDashboard, Users, CalendarCheck, Wallet } from "lucide-react";
import { getStudents } from "./firestoreService";
import StudentDirectory from "./components/StudentDirectory";
import AttendanceTracker from "./components/AttendanceTracker";
import FeeLedger from "./components/FeeLedger";
import Dashboard from "./components/Dashboard";
import SplashScreen from "./components/SplashScreen";

export const LOCATIONS = ["Galle", "Ja-Ela", "Colombo"];

const TABS = [
  { id: "dashboard",  label: "Dashboard",  short: "Home",       icon: LayoutDashboard },
  { id: "directory",  label: "Students",   short: "Students",   icon: Users           },
  { id: "attendance", label: "Attendance", short: "Attend",     icon: CalendarCheck   },
  { id: "fees",       label: "Fees",       short: "Fees",       icon: Wallet          },
];

export default function App() {
  const [tab, setTab]                       = useState("dashboard");
  const [students, setStudents]             = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);

  const loadStudents = useCallback(async () => {
    try {
      const data = await getStudents();
      setStudents(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch (err) {
      console.error("Failed to fetch students:", err);
    }
  }, []);

  useEffect(() => { if (activeLocation) loadStudents(); }, [activeLocation, loadStudents]);

  if (!activeLocation) {
    return (
      <>
        <Toaster position="top-center" />
        <SplashScreen onSelect={(city) => setActiveLocation(city)} />
      </>
    );
  }

  return (
    <div className="min-h-screen text-blue-950">

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1920&q=80"
          alt="background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-900/60 to-blue-950/80" />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { fontSize: "15px", fontWeight: "600", padding: "14px 18px", borderRadius: "14px", maxWidth: "420px" },
          success: { style: { background: "#dcfce7", color: "#166534", border: "2px solid #86efac" } },
          error:   { style: { background: "#fef2f2", color: "#991b1b", border: "2px solid #fca5a5" } },
        }}
      />

      {/* ── Header ── */}
      <header className="bg-blue-950/80 backdrop-blur-md text-white px-3 sm:px-6 py-3 shadow-xl border-b border-blue-700/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          {/* Logo — hide text on very small screens */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-blue-500/30 p-1.5 sm:p-2 rounded-xl shrink-0">
              <Music4 size={24} className="text-blue-200" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-extrabold leading-tight truncate">🎵 Vocal Class Manager</h1>
              <p className="text-blue-300 text-xs hidden sm:block">Sri Lanka · Students · Attendance · Fees</p>
            </div>
          </div>

          {/* City switcher pills */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <MapPin size={13} className="text-blue-400 hidden sm:block" />
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => setActiveLocation(loc)}
                className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                  activeLocation === loc
                    ? "bg-white text-blue-800 shadow-md"
                    : "bg-blue-800/50 text-blue-200 hover:bg-blue-700/60 border border-blue-600/40"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Desktop Tab Bar (hidden on mobile) ── */}
      <nav className="hidden sm:block bg-blue-950/60 backdrop-blur-md border-b border-blue-700/40 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  tab === t.id
                    ? "border-b-4 border-blue-400 text-white bg-blue-800/40"
                    : "text-blue-300 hover:text-white hover:bg-blue-800/20"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 sm:pb-8">
        {tab === "dashboard"  && (
          <Dashboard
            students={students}
            locations={LOCATIONS}
            activeLocation={activeLocation}
            onLocationChange={setActiveLocation}
          />
        )}
        {tab === "directory"  && (
          <StudentDirectory
            students={students}
            onStudentAdded={loadStudents}
            locations={LOCATIONS}
            activeLocation={activeLocation}
          />
        )}
        {tab === "attendance" && <AttendanceTracker students={students} activeLocation={activeLocation} />}
        {tab === "fees"       && <FeeLedger students={students} activeLocation={activeLocation} />}
      </main>

      {/* ── Mobile Bottom Nav (visible only on mobile) ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-blue-950/95 backdrop-blur-md border-t border-blue-700/40 safe-area-pb">
        <div className="flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all ${
                  active ? "text-white" : "text-blue-400"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-blue-600" : ""}`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-bold">{t.short}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <footer className="hidden sm:block text-center text-blue-300/60 text-sm py-6">
        Made with ♥ for Aunty Adele&apos;s Vocal Classes · Sri Lanka
      </footer>
    </div>
  );
}
