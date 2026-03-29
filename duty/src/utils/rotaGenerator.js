/**
 * Duty Rota Generator
 *
 * Distributes duties fairly across doctors with:
 * - Category-separated tracking (weekday, friday, saturday, sunday/holiday combined)
 * - Hard fairness caps: max spread of 1 within each category AND total
 * - No back-to-back constraint
 * - No alternate-day (day-on, day-off, day-on) constraint
 * - Friday→Sunday constraint (friday doctor excluded from following sunday)
 * - Leave request honoring
 * - Duty date requests (preferred dates for specific doctors)
 * - Optional per-doctor duty limits
 */

const DAY_CATEGORIES = {
  WEEKDAY: 'weekday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY_HOLIDAY: 'sundayHoliday',
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getDayOfWeek(year, month, day) {
  return new Date(year, month, day).getDay();
}

function categorizDay(year, month, day, holidays) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dow = getDayOfWeek(year, month, day);

  // Sundays and holidays share a single combined category for fair distribution
  if (holidays.some((h) => h.date === dateStr)) return DAY_CATEGORIES.SUNDAY_HOLIDAY;
  if (dow === 0) return DAY_CATEGORIES.SUNDAY_HOLIDAY;
  if (dow === 5) return DAY_CATEGORIES.FRIDAY;
  if (dow === 6) return DAY_CATEGORIES.SATURDAY;
  return DAY_CATEGORIES.WEEKDAY;
}

function createDoctorCounters(doctors) {
  const counters = {};
  doctors.forEach((doc) => {
    counters[doc.id] = { weekday: 0, friday: 0, saturday: 0, sundayHoliday: 0, total: 0 };
  });
  return counters;
}

function isDoctorOnLeave(doctorId, dateStr, leaveRequests) {
  const leaves = leaveRequests[doctorId] || [];
  return leaves.includes(dateStr);
}

function hasDutyRequest(doctorId, dateStr, dutyRequests) {
  const requests = dutyRequests[doctorId] || [];
  return requests.includes(dateStr);
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Pre-compute how many days of each category exist in the month.
 */
function computeCategoryCounts(year, month, holidays) {
  const totalDays = getDaysInMonth(year, month);
  const counts = { weekday: 0, friday: 0, saturday: 0, sundayHoliday: 0 };
  for (let day = 1; day <= totalDays; day++) {
    counts[categorizDay(year, month, day, holidays)]++;
  }
  return counts;
}

/**
 * Pick the best doctor from available pool with hard fairness caps.
 *
 * Strategy:
 * 0. If any doctors have requested this date, prefer them (filtered first)
 * 1. Filter to doctors UNDER the category cap (ceil), if possible
 * 2. Within that, filter to doctors UNDER the total cap (ceil), if possible
 * 3. Sort by: category count → total count → fewest-assigned-in-scarce-categories
 */
function pickDoctor(available, counters, category, caps, dateStr, dutyRequests, dutyLimits) {
  const { categoryCap, totalCap } = caps;

  // Level 0: prefer doctors who requested this specific date
  const requesters = available.filter((d) => hasDutyRequest(d.id, dateStr, dutyRequests));
  let pool = requesters.length > 0 ? requesters : available;

  // Level 1: prefer doctors under the cap for this category
  const underCatCap = pool.filter((d) => counters[d.id][category] < categoryCap);
  pool = underCatCap.length > 0 ? underCatCap : pool;

  // Level 2: within that, prefer doctors under the total cap (use per-doctor limit if set)
  const underTotalCap = pool.filter((d) => {
    const limit = dutyLimits[d.id];
    const cap = limit != null ? limit : totalCap;
    return counters[d.id].total < cap;
  });
  pool = underTotalCap.length > 0 ? underTotalCap : pool;

  // Sort by category count (primary), then total count (secondary), then scarce-category balance
  const sorted = [...pool].sort((a, b) => {
    const catDiff = counters[a.id][category] - counters[b.id][category];
    if (catDiff !== 0) return catDiff;

    const totalDiff = counters[a.id].total - counters[b.id].total;
    if (totalDiff !== 0) return totalDiff;

    // Tie-break: prefer doctor with fewer duties in scarce categories
    const aScarce = (counters[a.id].sundayHoliday || 0) + (counters[a.id].friday || 0) + (counters[a.id].saturday || 0);
    const bScarce = (counters[b.id].sundayHoliday || 0) + (counters[b.id].friday || 0) + (counters[b.id].saturday || 0);
    if (aScarce !== bScarce) return aScarce - bScarce;

    return Math.random() - 0.5;
  });

  return sorted[0];
}

/**
 * Generate a duty rota for a given month.
 */
export function generateRota({
  year,
  month,
  doctors,
  holidays = [],
  leaveRequests = {},
  dutyRequests = {},
  dutyLimits = {},
  previousDayDoctorId = null,
  carryOverCounters = null,
}) {
  if (!doctors || doctors.length === 0) {
    return { assignments: [], counters: {}, stats: {} };
  }

  const totalDays = getDaysInMonth(year, month);
  const numDoctors = doctors.length;
  const counters = carryOverCounters
    ? structuredClone(carryOverCounters)
    : createDoctorCounters(doctors);

  // Ensure all doctors have counter entries (handles new doctors or legacy data)
  doctors.forEach((doc) => {
    if (!counters[doc.id]) {
      counters[doc.id] = { weekday: 0, friday: 0, saturday: 0, sundayHoliday: 0, total: 0 };
    }
    // Migrate legacy counters that had separate sunday/holiday
    if ('sunday' in counters[doc.id] || 'holiday' in counters[doc.id]) {
      counters[doc.id].sundayHoliday =
        (counters[doc.id].sundayHoliday || 0) +
        (counters[doc.id].sunday || 0) +
        (counters[doc.id].holiday || 0);
      delete counters[doc.id].sunday;
      delete counters[doc.id].holiday;
    }
  });

  // Pre-compute category day counts and fairness caps
  const categoryCounts = computeCategoryCounts(year, month, holidays);
  const totalCap = Math.ceil(totalDays / numDoctors);

  const assignments = [];
  let prevDoctorId = previousDayDoctorId;
  let prevPrevDoctorId = null; // two days ago — for alternate-day constraint
  let lastFridayDoctorId = null;

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = formatDate(year, month, day);
    const category = categorizDay(year, month, day, holidays);
    const dow = getDayOfWeek(year, month, day);
    const categoryCap = Math.ceil(categoryCounts[category] / numDoctors);

    const caps = { categoryCap, totalCap };

    // Filter available doctors
    const available = doctors.filter((doc) => {
      if (isDoctorOnLeave(doc.id, dateStr, leaveRequests)) return false;
      if (doc.id === prevDoctorId) return false; // no back-to-back
      if (doc.id === prevPrevDoctorId) return false; // no alternate-day (day-on, off, day-on)
      if (dow === 0 && doc.id === lastFridayDoctorId) return false; // Friday→Sunday
      // Respect per-doctor duty limits as a hard constraint
      if (dutyLimits[doc.id] != null && counters[doc.id].total >= dutyLimits[doc.id]) return false;
      return true;
    });

    if (available.length === 0) {
      // Fallback: relax back-to-back / alternate-day constraints but still respect leaves & limits
      const fallback = doctors.filter((doc) => {
        if (isDoctorOnLeave(doc.id, dateStr, leaveRequests)) return false;
        if (dutyLimits[doc.id] != null && counters[doc.id].total >= dutyLimits[doc.id]) return false;
        return true;
      });
      if (fallback.length === 0) {
        assignments.push({ date: dateStr, day, category, doctorId: null, doctorInitials: '—' });
        prevPrevDoctorId = prevDoctorId;
        prevDoctorId = null;
        continue;
      }
      const chosen = pickDoctor(fallback, counters, category, caps, dateStr, dutyRequests, dutyLimits);
      assignments.push({
        date: dateStr, day, category,
        doctorId: chosen.id, doctorInitials: chosen.initials,
      });
      counters[chosen.id][category]++;
      counters[chosen.id].total++;
      if (dow === 5) lastFridayDoctorId = chosen.id;
      prevPrevDoctorId = prevDoctorId;
      prevDoctorId = chosen.id;
      continue;
    }

    const chosen = pickDoctor(available, counters, category, caps, dateStr, dutyRequests, dutyLimits);
    assignments.push({
      date: dateStr, day, category,
      doctorId: chosen.id, doctorInitials: chosen.initials,
    });
    counters[chosen.id][category]++;
    counters[chosen.id].total++;
    if (dow === 5) lastFridayDoctorId = chosen.id;
    prevPrevDoctorId = prevDoctorId;
    prevDoctorId = chosen.id;
  }

  // Build stats
  const stats = {};
  doctors.forEach((doc) => {
    stats[doc.id] = { ...counters[doc.id], name: doc.name, initials: doc.initials };
  });

  return { assignments, counters, stats };
}

/**
 * Recalculate counters and stats from assignments (used after manual swaps).
 */
export function recalculateStats(assignments, doctors) {
  const counters = {};
  doctors.forEach((doc) => {
    counters[doc.id] = { weekday: 0, friday: 0, saturday: 0, sundayHoliday: 0, total: 0 };
  });
  assignments.forEach((a) => {
    if (a.doctorId && counters[a.doctorId]) {
      counters[a.doctorId][a.category]++;
      counters[a.doctorId].total++;
    }
  });
  const stats = {};
  doctors.forEach((doc) => {
    stats[doc.id] = { ...counters[doc.id], name: doc.name, initials: doc.initials };
  });
  return { counters, stats };
}

export { DAY_CATEGORIES, formatDate, categorizDay };
