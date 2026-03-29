/**
 * Duty Calendar Sync Worker
 *
 * Endpoints:
 *   POST /api/rota       — Save rota data (called by the app on generate/swap)
 *   GET  /cal/team        — .ics for all doctors
 *   GET  /cal/:doctorId   — .ics for a specific doctor
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateToICS(dateStr) {
  return dateStr.replace(/-/g, '');
}

function nextDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function generateICS({ assignments, doctorId, doctorName, teamName, doctors }) {
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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // POST /api/rota — save rota data
    if (request.method === 'POST' && path === '/api/rota') {
      try {
        const body = await request.json();
        const { teamId, teamName, assignments, doctors } = body;
        if (!teamId || !assignments || !doctors) {
          return Response.json(
            { error: 'Missing required fields: teamId, assignments, doctors' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        await env.DUTY_STORE.put(
          `rota:${teamId}`,
          JSON.stringify({ teamName, assignments, doctors, updatedAt: new Date().toISOString() })
        );
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      } catch (err) {
        return Response.json(
          { error: 'Invalid request body' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    // GET /cal/:path — serve .ics
    const calMatch = path.match(/^\/cal\/(.+)$/);
    if (request.method === 'GET' && calMatch) {
      const calPath = calMatch[1];
      const teamId = url.searchParams.get('team') || 'default';

      const stored = await env.DUTY_STORE.get(`rota:${teamId}`);
      if (!stored) {
        return new Response('No rota data found. Generate a rota first.', {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
        });
      }

      const { teamName, assignments, doctors } = JSON.parse(stored);

      let icsContent;
      if (calPath === 'team') {
        icsContent = generateICS({
          assignments,
          doctorId: null,
          doctorName: 'All',
          teamName,
          doctors,
        });
      } else {
        const doc = doctors.find((d) => d.id === calPath);
        if (!doc) {
          return new Response('Doctor not found', {
            status: 404,
            headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
          });
        }
        icsContent = generateICS({
          assignments,
          doctorId: doc.id,
          doctorName: doc.name,
          teamName,
          doctors,
        });
      }

      return new Response(icsContent, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="duty_${calPath}.ics"`,
        },
      });
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};
