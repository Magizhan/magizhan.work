import './StatsPanel.css';
import DoctorBadge from './DoctorBadge';

export default function StatsPanel({ stats, doctors }) {
  if (!stats || Object.keys(stats).length === 0) return null;

  const maxTotal = Math.max(...Object.values(stats).map((s) => s.total), 1);

  return (
    <div className="stats-panel">
      <h3 className="stats-title">Duty Distribution</h3>
      <div className="stats-grid">
        <div className="stats-header">
          <span>Doctor</span>
          <span><span className="label-full">Wkday</span><span className="label-short">Wk</span></span>
          <span><span className="label-full">Fri</span><span className="label-short">Fr</span></span>
          <span><span className="label-full">Sat</span><span className="label-short">Sa</span></span>
          <span><span className="label-full">Sun/Hol</span><span className="label-short">S/H</span></span>
          <span><span className="label-full">Total</span><span className="label-short">Tot</span></span>
        </div>
        {doctors.map((doc) => {
          const s = stats[doc.id];
          if (!s) return null;
          const barWidth = (s.total / maxTotal) * 100;

          return (
            <div key={doc.id} className="stats-row">
              <span className="stats-doctor">
                <DoctorBadge initials={doc.initials} color={doc.color} name={doc.name} size="sm" />
                <span className="stats-name">{doc.name}</span>
              </span>
              <span className="stats-num">{s.weekday}</span>
              <span className="stats-num">{s.friday}</span>
              <span className="stats-num">{s.saturday}</span>
              <span className="stats-num">{s.sundayHoliday || 0}</span>
              <span className="stats-total">
                <span
                  className="stats-bar"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: doc.color,
                  }}
                />
                <span className="stats-total-num">{s.total}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
