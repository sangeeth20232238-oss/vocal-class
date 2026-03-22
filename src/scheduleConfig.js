// src/scheduleConfig.js
// Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

export const LOCATION_SCHEDULE = {
  "Ja-Ela":  { day: 2, label: "Tuesdays"  },  // Tuesday
  "Galle":   { day: 4, label: "Thursdays" },  // Thursday
  "Colombo": { day: 4, label: "Thursdays" },  // Thursday
};

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
