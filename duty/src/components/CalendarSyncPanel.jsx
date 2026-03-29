import { useCallback } from 'react';
import DoctorBadge from './DoctorBadge';
import { generateICS, downloadICS } from '../utils/icsGenerator';
import './CalendarSyncPanel.css';

const WORKER_BASE = 'https://duty-cal.mags-814.workers.dev';

export default function CalendarSyncPanel({ assignments, doctors, teamName, year, month }) {
  const handleDownloadDoctor = useCallback((doc) => {
    const ics = generateICS({
      assignments,
      doctorId: doc.id,
      doctorName: doc.name,
      teamName,
      doctors,
    });
    downloadICS(ics, `duty_${doc.initials}_${year}_${month + 1}.ics`);
  }, [assignments, doctors, teamName, year, month]);

  const handleDownloadAll = useCallback(() => {
    const ics = generateICS({
      assignments,
      doctorId: null,
      doctorName: 'All',
      teamName,
      doctors,
    });
    downloadICS(ics, `duty_all_${year}_${month + 1}.ics`);
  }, [assignments, doctors, teamName, year, month]);

  const handleCopyLink = useCallback(async (path) => {
    const url = `${WORKER_BASE}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  }, []);

  return (
    <div className="sync-panel">
      <h3 className="sync-title">Export to Calendar</h3>
      <p className="sync-subtitle">Download .ics files to import into Google Calendar, Apple Calendar, or Outlook</p>

      <div className="sync-doctors">
        {doctors.map((doc) => {
          const dutyCount = assignments.filter((a) => a.doctorId === doc.id).length;
          return (
            <button
              key={doc.id}
              className="sync-doctor-btn"
              onClick={() => handleDownloadDoctor(doc)}
              title={`Download ${doc.name}'s duties (${dutyCount} days)`}
            >
              <DoctorBadge initials={doc.initials} color={doc.color} name={doc.name} size="sm" />
              <span className="sync-doctor-name">{doc.name}</span>
              <span className="sync-doctor-count">{dutyCount}</span>
              <span className="sync-download-icon">↓</span>
            </button>
          );
        })}
      </div>

      <div className="sync-actions">
        <button className="btn btn-secondary" onClick={handleDownloadAll}>
          📅 Download Team Calendar (.ics)
        </button>
      </div>

      <div className="sync-subscribe">
        <p className="sync-subscribe-title">Live Calendar Sync</p>
        <p className="sync-subscribe-hint">Subscribe once — calendar updates automatically when duties change</p>
        <div className="sync-links">
          <div className="sync-link-row">
            <span className="sync-link-label">Team calendar</span>
            <button className="btn btn-sm btn-secondary" onClick={() => handleCopyLink('/cal/team')}>
              Copy Link
            </button>
          </div>
          {doctors.map((doc) => (
            <div key={doc.id} className="sync-link-row">
              <span className="sync-link-label">
                <DoctorBadge initials={doc.initials} color={doc.color} name={doc.name} size="sm" />
                {doc.name}
              </span>
              <button className="btn btn-sm btn-secondary" onClick={() => handleCopyLink(`/cal/${doc.id}`)}>
                Copy Link
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
