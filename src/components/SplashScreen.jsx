// src/components/SplashScreen.jsx
import { useState } from "react";
import { Music4, MapPin } from "lucide-react";

const CITIES = [
  { id: "Galle",   emoji: "🌊", description: "Southern Province", gradient: "from-cyan-600 to-blue-700",   border: "border-cyan-400"   },
  { id: "Ja-Ela",  emoji: "🌿", description: "Western Province",  gradient: "from-blue-600 to-indigo-700", border: "border-blue-400"   },
  { id: "Colombo", emoji: "🏙️", description: "Capital City",      gradient: "from-indigo-600 to-purple-700", border: "border-indigo-400" },
];

export default function SplashScreen({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const [entering, setEntering] = useState(false);

  const handleEnter = () => {
    if (!selected) return;
    setEntering(true);
    setTimeout(() => onSelect(selected), 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1920&q=80"
          alt="background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/90 via-blue-900/80 to-blue-950/95" />
      </div>

      {/* Fade-out overlay */}
      <div className={`fixed inset-0 bg-blue-950 transition-opacity duration-500 pointer-events-none ${entering ? "opacity-100" : "opacity-0"}`} />

      {/* Logo */}
      <div className="flex flex-col items-center mb-6 sm:mb-10 animate-[fadeInDown_0.7s_ease_both]">
        <div className="bg-blue-500/20 border border-blue-400/30 p-4 sm:p-5 rounded-3xl mb-3 sm:mb-4 shadow-2xl">
          <Music4 size={44} className="text-blue-200" />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight text-center">
          🎵 Vocal Class Manager
        </h1>
        <p className="text-blue-300 text-sm sm:text-base mt-2 text-center px-4">
          Welcome, Aunty Adele! Which class are you managing today?
        </p>
      </div>

      {/* City Cards — stack on small phones, row on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full max-w-xs sm:max-w-2xl mb-6 sm:mb-8 animate-[fadeInUp_0.7s_0.2s_ease_both_backwards]">
        {CITIES.map((city) => {
          const isSelected = selected === city.id;
          return (
            <button
              key={city.id}
              onClick={() => setSelected(city.id)}
              className={`relative flex sm:flex-col items-center sm:justify-center gap-3 sm:gap-2 p-4 sm:p-7 rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 cursor-pointer shadow-xl
                bg-gradient-to-br ${city.gradient}
                ${isSelected
                  ? `${city.border} shadow-2xl ring-4 ring-white/30`
                  : "border-white/10 hover:border-white/30 opacity-80 hover:opacity-100"
                }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-extrabold text-sm shadow">
                  ✓
                </div>
              )}
              <span className="text-3xl sm:text-5xl">{city.emoji}</span>
              <div className="text-left sm:text-center">
                <span className="text-lg sm:text-2xl font-extrabold text-white block">{city.id}</span>
                <span className="text-xs text-white/70 font-medium flex items-center gap-1 sm:justify-center">
                  <MapPin size={11} /> {city.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Enter Button */}
      <button
        onClick={handleEnter}
        disabled={!selected || entering}
        className={`w-full max-w-xs sm:max-w-sm px-8 py-4 rounded-2xl text-lg font-extrabold transition-all duration-300 shadow-xl ${
          selected
            ? "bg-white text-blue-800 hover:bg-blue-50 cursor-pointer"
            : "bg-white/20 text-white/40 cursor-not-allowed"
        }`}
      >
        {entering ? "Opening…" : selected ? `Enter ${selected} Classes →` : "Select a city above"}
      </button>

      <p className="text-blue-400/60 text-xs mt-4">Made with ♥ for Aunty Adele · Sri Lanka</p>
    </div>
  );
}
