// src/scheduleConfig.js
// Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

export const LOCATION_SCHEDULE = {
  "Ja-Ela":  { day: 2, label: "Tuesdays"  },
  "Galle":   { day: 4, label: "Thursdays" },
  "Colombo": { day: 4, label: "Thursdays" },
};

// Age class groups per location
// minAge inclusive, maxAge inclusive (null = no upper limit)
export const LOCATION_CLASS_GROUPS = {
  "Colombo": [
    { id: "colombo-6-9",   label: "Age 6–9",    minAge: 6,  maxAge: 9  },
    { id: "colombo-10-13", label: "Age 10–13",  minAge: 10, maxAge: 13 },
  ],
  "Ja-Ela": [
    { id: "jaela-10-14",   label: "Age 10–14",  minAge: 10, maxAge: 14 },
    { id: "jaela-15plus",  label: "Age 15+",    minAge: 15, maxAge: null },
  ],
  "Galle": [
    { id: "galle-5-9",     label: "Age 5–9",    minAge: 5,  maxAge: 9  },
    { id: "galle-10-14",   label: "Age 10–14",  minAge: 10, maxAge: 14 },
    { id: "galle-15plus",  label: "Age 15+ / Adult", minAge: 15, maxAge: null },
  ],
};

/**
 * Given a location and a date-of-birth string ("YYYY-MM-DD"),
 * returns the matching class group id, or null if it can't be determined.
 */
export function suggestClassGroup(location, dob) {
  if (!dob || !location) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  const groups = LOCATION_CLASS_GROUPS[location] || [];
  const match = groups.find((g) => age >= g.minAge && (g.maxAge === null || age <= g.maxAge));
  return match?.id || null;
}

// Returns all YYYY-MM-DD dates in a given "YYYY-MM" month that fall on the location's class day
export function getScheduledDates(location, monthPrefix) {
  const schedule = LOCATION_SCHEDULE[location];
  if (!schedule) return [];
  const [year, month] = monthPrefix.split("-").map(Number);
  const dates = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === schedule.day) {
      dates.push(`${monthPrefix}-${String(d).padStart(2, "0")}`);
    }
  }
  return dates;
}
