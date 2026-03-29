/**
 * Generate an iCalendar (.ics) string for duty assignments.
 * Per RFC 5545, line endings must be \r\n.
 */

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateToICS(dateStr) {
  // "2026-04-01" → "20260401"
  return dateStr.replace(/-/g, '');
}

function nextDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * Generate .ics content for a specific doctor or all doctors.
 * @param {Object} options
 * @param {Array} options.assignments - All assignments for the month
 * @param {string|null} options.doctorId - Filter to this doctor, or null for all
 * @param {string} options.doctorName - Name for the calendar title
 * @param {string} options.teamName - Team name for event summaries
 * @param {Array} options.doctors - All doctors (for name lookup when doctorId is null)
 */
export function generateICS({ assignments, doctorId, doctorName, teamName, doctors }) {
  const filtered = doctorId
    ? assignments.filter((a) => a.doctorId === doctorId)
    : assignments.filter((a) => a.doctorId);

  const calName = doctorId
    ? `Duty - ${doctorName}`
    : `Duty Rota - ${teamName}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DutyRota//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
  ];

  filtered.forEach((a) => {
    const doc = doctors.find((d) => d.id === a.doctorId);
    const name = doc?.name || a.doctorInitials;
    const summary = doctorId
      ? `Duty - ${teamName}`
      : `Duty - ${name}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:duty-${a.doctorId}-${a.date}@duty-rota`,
      `DTSTART;VALUE=DATE:${dateToICS(a.date)}`,
      `DTEND;VALUE=DATE:${nextDay(a.date)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:On-call duty${doctorId ? '' : ` for ${name}`}`,
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(icsContent, filename) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
