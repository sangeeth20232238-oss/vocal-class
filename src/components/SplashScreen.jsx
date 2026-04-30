// src/components/SplashScreen.jsx
import { useState } from "react";
import { Music4, MapPin, ArrowRight, Waves, TreePine, Building2 } from "lucide-react";

const CITIES = [
  {
    id: "Galle",
    icon: Waves,
    description: "Southern Province",
    gradient: "linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #164e63 100%)",
    glow: "rgba(8, 145, 178, 0.4)",
    accent: "#22d3ee",
  },
  {
    id: "Ja-Ela",
    icon: TreePine,
    description: "Western Province",
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)",
    glow: "rgba(29, 78, 216, 0.4)",
    accent: "#60a5fa",
  },
  {
    id: "Colombo",
    icon: Building2,
    description: "Capital City",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)",
    glow: "rgba(124, 58, 237, 0.4)",
    accent: "#a78bfa",
  },
];

export default function SplashScreen({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const [entering, setEntering] = useState(false);

  const handleEnter = () => {
    if (!selected || entering) return;
    setEntering(true);
    setTimeout(() => onSelect(selected), 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1920&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(5,13,26,0.95) 0%, rgba(10,22,40,0.88) 50%, rgba(5,13,26,0.97) 100%)" }} />
      </div>

      {/* Fade-out overlay */}
      <div className={`fixed inset-0 bg-slate-950 transition-opacity duration-700 pointer-events-none ${entering ? "opacity-100" : "opacity-0"}`} />

      {/* Logo section */}
      <div className="flex flex-col items-center mb-10 animate-fade-in-down">
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)" }}>
            <Music4 size={38} className="text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center">
            <span className="text-xs">🎵</span>
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight text-center leading-tight">
          Vocal Class
          <span className="block" style={{ background: "linear-gradient(90deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Manager
          </span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-3 text-center max-w-xs">
          Welcome back, <span className="text-white font-semibold">Aunty Adele</span>! Which class are you managing today?
        </p>
      </div>

      {/* City Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-sm sm:max-w-2xl mb-8 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
        {CITIES.map((city) => {
          const Icon = city.icon;
          const isSelected = selected === city.id;
          return (
            <button
              key={city.id}
              onClick={() => setSelected(city.id)}
              className="relative flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-3 p-5 sm:p-7 rounded-2xl transition-all duration-300 cursor-pointer text-left sm:text-center overflow-hidden group"
              style={{
                background: city.gradient,
                boxShadow: isSelected
                  ? `0 0 0 2px ${city.accent}, 0 8px 40px ${city.glow}, 0 4px 16px rgba(0,0,0,0.3)`
                  : "0 4px 20px rgba(0,0,0,0.25)",
                transform: isSelected ? "translateY(-2px) scale(1.02)" : "translateY(0) scale(1)",
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%)" }} />

              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <span className="text-xs font-black" style={{ color: city.accent.replace("fa", "00").replace("ee", "00") }}>✓</span>
                </div>
              )}

              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                <Icon size={24} className="text-white" />
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-black text-white">{city.id}</div>
                <div className="flex items-center gap-1 mt-0.5 sm:justify-center">
                  <MapPin size={11} className="text-white/60" />
                  <span className="text-xs text-white/60 font-medium">{city.description}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Enter Button */}
      <div className="w-full max-w-sm animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
        <button
          onClick={handleEnter}
          disabled={!selected || entering}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold transition-all duration-300"
          style={selected ? {
            background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
            color: "white",
            boxShadow: "0 4px 24px rgba(29, 78, 216, 0.45)",
            transform: "translateY(0)",
          } : {
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.3)",
            cursor: "not-allowed",
          }}
        >
          {entering ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Opening…
            </>
          ) : selected ? (
            <>
              Enter {selected} Classes
              <ArrowRight size={18} />
            </>
          ) : (
            "Select a location above"
          )}
        </button>
      </div>

      <p className="text-slate-600 text-xs mt-6">Made with ♥ for Aunty Adele · Sri Lanka</p>
    </div>
  );
}
