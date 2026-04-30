// src/App.jsx
import { useState, useEffect, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import { Music4, MapPin, LayoutDashboard, Users, CalendarCheck, Wallet, ChevronDown } from "lucide-react";
import { getStudents } from "./firestoreService";
import StudentDirectory from "./components/StudentDirectory";
import AttendanceTracker from "./components/AttendanceTracker";
import FeeLedger from "./components/FeeLedger";
import Dashboard from "./components/Dashboard";
import SplashScreen from "./components/SplashScreen";

export const LOCATIONS = ["Galle", "Ja-Ela", "Colombo"];

const TABS = [
  { id: "dashboard",  label: "Dashboard",  short: "Home",    icon: LayoutDashboard },
  { id: "directory",  label: "Students",   short: "Students", icon: Users           },
  { id: "attendance", label: "Attendance", short: "Attend",  icon: CalendarCheck   },
  { id: "fees",       label: "Fees",       short: "Fees",    icon: Wallet          },
];

const LOCATION_COLORS = {
  Galle:   { dot: "bg-cyan-400",   pill: "bg-cyan-500/20 text-cyan-200 border-cyan-500/30" },
  "Ja-Ela": { dot: "bg-blue-400",  pill: "bg-blue-500/20 text-blue-200 border-blue-500/30" },
  Colombo: { dot: "bg-violet-400", pill: "bg-violet-500/20 text-violet-200 border-violet-500/30" },
};

export default function App() {
  const [tab, setTab]                       = useState("dashboard");
  const [students, setStudents]             = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);

  // Close mobile location dropdown when clicking outside
  useEffect(() => {
    if (!locationMenuOpen) return;
    const handler = (e) => {
      if (!e.target.closest("[data-location-menu]")) setLocationMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [locationMenuOpen]);

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

  const locColor = LOCATION_COLORS[activeLocation] || LOCATION_COLORS.Galle;

  return (
    <div className="min-h-screen text-slate-900">

      {/* ── Background ── */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1920&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/92 via-blue-950/85 to-slate-950/92" />
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { fontSize: "14px", fontWeight: "600", padding: "12px 16px", borderRadius: "12px", maxWidth: "400px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" },
          success: { style: { background: "#f0fdf4", color: "#15803d", border: "1.5px solid #86efac" } },
          error:   { style: { background: "#fef2f2", color: "#b91c1c", border: "1.5px solid #fca5a5" } },
        }}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-white/8"
        style={{ background: "rgba(5, 13, 26, 0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)" }}>
                <Music4 size={18} className="text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="text-white font-extrabold text-base leading-tight tracking-tight">Vocal Class Manager</div>
              <div className="text-slate-400 text-xs">Aunty Adele · Sri Lanka</div>
            </div>
            <div className="text-white font-extrabold text-base sm:hidden">VCM</div>
          </div>

          {/* Location switcher */}
          <div className="flex items-center gap-2">
            {/* Desktop: pill buttons */}
            <div className="hidden sm:flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
              <MapPin size={13} className="text-slate-400 ml-1.5" />
              {LOCATIONS.map((loc) => {
                const isActive = activeLocation === loc;
                const c = LOCATION_COLORS[loc];
                return (
                  <button key={loc} onClick={() => setActiveLocation(loc)}
                    className={`btn-inline-sm px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    }`}>
                    {isActive && <span className={`inline-block w-1.5 h-1.5 rounded-full ${c.dot} mr-1.5 mb-px`} />}
                    {loc}
                  </button>
                );
              })}
            </div>

            {/* Mobile: dropdown */}
            <div className="sm:hidden relative" data-location-menu>
              <button onClick={() => setLocationMenuOpen((o) => !o)}
                className={`btn-inline-sm flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${locColor.pill} border-current`}>
                <span className={`w-1.5 h-1.5 rounded-full ${locColor.dot}`} />
                {activeLocation}
                <ChevronDown size={12} className={`transition-transform ${locationMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {locationMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-36 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50"
                  style={{ background: "rgba(10, 22, 40, 0.97)", backdropFilter: "blur(20px)" }}>
                  {LOCATIONS.map((loc) => (
                    <button key={loc} onClick={() => { setActiveLocation(loc); setLocationMenuOpen(false); }}
                      className={`btn-inline-sm w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${
                        activeLocation === loc ? "text-white bg-white/10" : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${LOCATION_COLORS[loc]?.dot}`} />
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop Tab Bar ── */}
        <div className="hidden sm:block border-t border-white/6">
          <div className="max-w-5xl mx-auto flex">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`relative flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
                  }`}>
                  <Icon size={15} />
                  {t.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-8 pb-24 sm:pb-10">
        {tab === "dashboard"  && (
          <Dashboard students={students} locations={LOCATIONS} activeLocation={activeLocation} onLocationChange={setActiveLocation} />
        )}
        {tab === "directory"  && (
          <StudentDirectory students={students} onStudentAdded={loadStudents} locations={LOCATIONS} activeLocation={activeLocation} />
        )}
        {tab === "attendance" && <AttendanceTracker students={students} activeLocation={activeLocation} />}
        {tab === "fees"       && <FeeLedger students={students} activeLocation={activeLocation} />}
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-pb border-t border-white/8"
        style={{ background: "rgba(5, 13, 26, 0.95)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
        <div className="flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all ${
                  isActive ? "text-white" : "text-slate-500"
                }`}>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-blue-600/80" : ""}`}>
                  <Icon size={19} />
                </div>
                <span className="text-[10px] font-bold tracking-wide">{t.short}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <footer className="hidden sm:block text-center text-slate-500 text-xs py-8">
        Made with ♥ for Aunty Adele&apos;s Vocal Classes · Sri Lanka
      </footer>
    </div>
  );
}
