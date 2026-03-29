/**
 * Validates a swap of two assignments and returns any constraint warnings.
 */
export function validateSwap(assignments, dayA, dayB, leaveRequests, holidays, doctors) {
  const warnings = [];
  const assignA = assignments.find((a) => a.day === dayA);
  const assignB = assignments.find((a) => a.day === dayB);
  if (!assignA || !assignB || !assignA.doctorId || !assignB.doctorId) return warnings;

  const doctorAId = assignA.doctorId;
  const doctorBId = assignB.doctorId;
  const doctorA = doctors.find((d) => d.id === doctorAId);
  const doctorB = doctors.find((d) => d.id === doctorBId);
  const nameA = doctorA?.name || assignA.doctorInitials;
  const nameB = doctorB?.name || assignB.doctorInitials;

  // Build day→doctorId lookup (simulating the swap)
  const dayMap = {};
  assignments.forEach((a) => {
    dayMap[a.day] = a.doctorId;
  });
  // Apply the swap
  dayMap[dayA] = doctorBId;
  dayMap[dayB] = doctorAId;

  // Check back-to-back (consecutive days)
  function checkBackToBack(day, docId, docName) {
    if (dayMap[day - 1] === docId) {
      warnings.push(`${docName} would have back-to-back duties on days ${day - 1} and ${day}`);
    }
    if (dayMap[day + 1] === docId) {
      warnings.push(`${docName} would have back-to-back duties on days ${day} and ${day + 1}`);
    }
  }

  // Check alternate-day (day-on, off, day-on)
  function checkAlternateDay(day, docId, docName) {
    if (dayMap[day - 2] === docId) {
      warnings.push(`${docName} would have alternate-day duties on days ${day - 2} and ${day}`);
    }
    if (dayMap[day + 2] === docId) {
      warnings.push(`${docName} would have alternate-day duties on days ${day} and ${day + 2}`);
    }
  }

  // Check leave conflicts
  function checkLeave(day, dateStr, docId, docName) {
    const leaves = leaveRequests[docId] || [];
    if (leaves.includes(dateStr)) {
      warnings.push(`${docName} is on leave on day ${day}`);
    }
  }

  // Doctor B moving to day A's position
  checkBackToBack(dayA, doctorBId, nameB);
  checkAlternateDay(dayA, doctorBId, nameB);
  checkLeave(dayA, assignA.date, doctorBId, nameB);

  // Doctor A moving to day B's position
  checkBackToBack(dayB, doctorAId, nameA);
  checkAlternateDay(dayB, doctorAId, nameA);
  checkLeave(dayB, assignB.date, doctorAId, nameA);

  // Friday→Sunday check
  const dowA = new Date(assignA.date).getDay();
  const dowB = new Date(assignB.date).getDay();

  // If day A is Friday and day A+2 is Sunday, check if doctor B (now on Friday) is also on Sunday
  if (dowA === 5 && dayMap[dayA + 2] === doctorBId) {
    const sundayAssign = assignments.find((a) => a.day === dayA + 2);
    if (sundayAssign && new Date(sundayAssign.date).getDay() === 0) {
      warnings.push(`${nameB} would be on both Friday (day ${dayA}) and Sunday (day ${dayA + 2})`);
    }
  }
  if (dowB === 5 && dayMap[dayB + 2] === doctorAId) {
    const sundayAssign = assignments.find((a) => a.day === dayB + 2);
    if (sundayAssign && new Date(sundayAssign.date).getDay() === 0) {
      warnings.push(`${nameA} would be on both Friday (day ${dayB}) and Sunday (day ${dayB + 2})`);
    }
  }
  // If day A is Sunday, check if doctor B is on the preceding Friday
  if (dowA === 0 && dayMap[dayA - 2] === doctorBId) {
    const fridayAssign = assignments.find((a) => a.day === dayA - 2);
    if (fridayAssign && new Date(fridayAssign.date).getDay() === 5) {
      warnings.push(`${nameB} would be on both Friday (day ${dayA - 2}) and Sunday (day ${dayA})`);
    }
  }
  if (dowB === 0 && dayMap[dayB - 2] === doctorAId) {
    const fridayAssign = assignments.find((a) => a.day === dayB - 2);
    if (fridayAssign && new Date(fridayAssign.date).getDay() === 5) {
      warnings.push(`${nameA} would be on both Friday (day ${dayB - 2}) and Sunday (day ${dayB})`);
    }
  }

  // Deduplicate warnings
  return [...new Set(warnings)];
}
