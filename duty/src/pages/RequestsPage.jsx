import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRota } from '../context/RotaContext';
import { MONTH_NAMES, DAY_LABELS } from '../constants/defaults';
import DoctorBadge from '../components/DoctorBadge';
import MonthPicker from '../components/MonthPicker';
import './RequestsPage.css';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function RequestsPage() {
  const {
    activeTeam,
    setLeaveRequests,
    setDutyRequests,
    setDutyLimit,
    addHoliday,
    removeHoliday,
    setMonthYear,
    generate,
  } = useRota();

  const navigate = useNavigate();
  const {
    doctors, leaveRequests, holidays, selectedMonth: month, selectedYear: year,
    dutyRequests = {}, dutyLimits = {},
  } = activeTeam;

  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [calendarMode, setCalendarMode] = useState('leave'); // 'leave' or 'duty'

  const totalDays = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const selectedLeaves = leaveRequests[selectedDoctorId] || [];
  const selectedDutyReqs = dutyRequests[selectedDoctorId] || [];

  // Holidays for current month
  const monthHolidays = useMemo(
    () =>
      holidays.filter((h) => {
        const [hy, hm] = h.date.split('-').map(Number);
        return hy === year && hm === month + 1;
      }),
    [holidays, year, month]
  );

  const toggleLeave = useCallback(
    (dateStr) => {
      const current = leaveRequests[selectedDoctorId] || [];
      const updated = current.includes(dateStr)
        ? current.filter((d) => d !== dateStr)
        : [...current, dateStr];
      setLeaveRequests(selectedDoctorId, updated);
    },
    [selectedDoctorId, leaveRequests, setLeaveRequests]
  );

  const toggleDutyRequest = useCallback(
    (dateStr) => {
      const current = dutyRequests[selectedDoctorId] || [];
      const updated = current.includes(dateStr)
        ? current.filter((d) => d !== dateStr)
        : [...current, dateStr];
      setDutyRequests(selectedDoctorId, updated);
    },
    [selectedDoctorId, dutyRequests, setDutyRequests]
  );

  const handleToggleDate = useCallback(
    (dateStr) => {
      if (calendarMode === 'leave') {
        toggleLeave(dateStr);
      } else {
        toggleDutyRequest(dateStr);
      }
    },
    [calendarMode, toggleLeave, toggleDutyRequest]
  );

  const handleAddHoliday = () => {
    if (!newHolidayDate || !newHolidayName.trim()) return;
    addHoliday(newHolidayDate, newHolidayName.trim());
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleGenerate = () => {
    generate();
    navigate('/');
  };

  const handleMonthChange = (m, y) => setMonthYear(m, y);

  // Build mini calendar cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ empty: true, key: `e-${i}` });
  }
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = formatDate(year, month, day);
    const isLeave = selectedLeaves.includes(dateStr);
    const isDutyReq = selectedDutyReqs.includes(dateStr);
    const dow = new Date(year, month, day).getDay();
    const isHoliday = holidays.some((h) => h.date === dateStr);
    cells.push({ empty: false, key: `d-${day}`, day, dateStr, isLeave, isDutyReq, isSunday: dow === 0, isHoliday });
  }

  const totalLeaves = Object.values(leaveRequests).flat().length;
  const totalDutyReqs = Object.values(dutyRequests).flat().length;
  const totalLimitsSet = Object.keys(dutyLimits).length;

  return (
    <div className="requests-page">
      {/* Leave & Duty Requests */}
      <section className="card">
        <h2 className="card-title">Leave & Duty Requests</h2>
        <div className="requests-layout">
          <div className="doctor-selector">
            <label className="field-label">Select Doctor</label>
            <div className="doctor-chips">
              {doctors.map((doc) => {
                const leaveCount = (leaveRequests[doc.id] || []).length;
                const dutyReqCount = (dutyRequests[doc.id] || []).length;
                const hasItems = leaveCount > 0 || dutyReqCount > 0;
                return (
                  <button
                    key={doc.id}
                    className={`doctor-chip ${selectedDoctorId === doc.id ? 'active' : ''} ${hasItems ? 'has-leaves' : ''}`}
                    onClick={() => setSelectedDoctorId(doc.id)}
                  >
                    <DoctorBadge initials={doc.initials} color={doc.color} name={doc.name} size="sm" />
                    <span>{doc.name}</span>
                    {leaveCount > 0 && (
                      <span className="leave-count" title="No-duty days">{leaveCount}</span>
                    )}
                    {dutyReqCount > 0 && (
                      <span className="duty-req-count" title="Requested duty days">{dutyReqCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="leave-calendar">
            <div className="leave-cal-header">
              <MonthPicker month={month} year={year} onChange={handleMonthChange} />
              <div className="calendar-mode-toggle">
                <button
                  className={`mode-btn ${calendarMode === 'leave' ? 'active leave-mode' : ''}`}
                  onClick={() => setCalendarMode('leave')}
                >
                  No Duty
                </button>
                <button
                  className={`mode-btn ${calendarMode === 'duty' ? 'active duty-mode' : ''}`}
                  onClick={() => setCalendarMode('duty')}
                >
                  Want Duty
                </button>
              </div>
            </div>
            <p className="leave-hint">
              {calendarMode === 'leave'
                ? 'Click dates to mark no-duty / leave days'
                : 'Click dates to request preferred duty days'}
            </p>
            <div className="mini-calendar">
              {DAY_LABELS.map((label) => (
                <div key={label} className="mini-day-header">{label}</div>
              ))}
              {cells.map((cell) => {
                if (cell.empty) return <div key={cell.key} className="mini-cell empty" />;
                const classes = [
                  'mini-cell',
                  cell.isLeave ? 'leave' : '',
                  cell.isDutyReq ? 'duty-req' : '',
                  cell.isSunday ? 'sunday' : '',
                  cell.isHoliday ? 'holiday' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={cell.key}
                    className={classes}
                    onClick={() => handleToggleDate(cell.dateStr)}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {selectedLeaves.length > 0 && (
              <div className="selected-leaves">
                <span className="field-label">No-duty dates:</span>
                <div className="leave-tags">
                  {selectedLeaves.sort().map((d) => (
                    <span key={d} className="leave-tag">
                      {d.split('-')[2]}/{MONTH_NAMES[month].slice(0, 3)}
                      <button className="leave-tag-x" onClick={() => toggleLeave(d)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedDutyReqs.length > 0 && (
              <div className="selected-leaves">
                <span className="field-label">Requested duty dates:</span>
                <div className="leave-tags">
                  {selectedDutyReqs.sort().map((d) => (
                    <span key={d} className="duty-req-tag">
                      {d.split('-')[2]}/{MONTH_NAMES[month].slice(0, 3)}
                      <button className="leave-tag-x" onClick={() => toggleDutyRequest(d)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Duty Limits */}
      <section className="card">
        <h2 className="card-title">Duty Limits (Optional)</h2>
        <p className="card-subtitle">Set maximum number of duties per doctor. Leave blank for automatic fair distribution.</p>
        <div className="duty-limits-grid">
          {doctors.map((doc) => (
            <div key={doc.id} className="duty-limit-row">
              <DoctorBadge initials={doc.initials} color={doc.color} name={doc.name} size="sm" />
              <span className="duty-limit-name">{doc.name}</span>
              <input
                type="number"
                className="input input-sm duty-limit-input"
                min="0"
                max="31"
                placeholder="Auto"
                value={dutyLimits[doc.id] ?? ''}
                onChange={(e) => setDutyLimit(doc.id, e.target.value === '' ? null : e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Holiday Management */}
      <section className="card">
        <h2 className="card-title">Holidays — {MONTH_NAMES[month]} {year}</h2>
        {monthHolidays.length > 0 ? (
          <div className="holiday-list">
            {monthHolidays.map((h) => (
              <div key={h.date} className="holiday-item">
                <span className="holiday-date">{h.date.split('-')[2]}</span>
                <span className="holiday-name">{h.name}</span>
                <button className="btn btn-danger btn-sm" onClick={() => removeHoliday(h.date)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-holidays">No holidays this month</p>
        )}
        <div className="add-holiday-row">
          <input
            type="date"
            className="input"
            value={newHolidayDate}
            onChange={(e) => setNewHolidayDate(e.target.value)}
          />
          <input
            type="text"
            className="input"
            placeholder="Holiday name"
            value={newHolidayName}
            onChange={(e) => setNewHolidayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddHoliday()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAddHoliday}>
            + Add Holiday
          </button>
        </div>
      </section>

      {/* Generate Actions */}
      <section className="card generate-card">
        <div className="generate-info">
          <h2 className="card-title">Generate Duty Rota</h2>
          <p className="card-subtitle">
            {MONTH_NAMES[month]} {year} • {doctors.length} doctors •{' '}
            {totalLeaves} leave days
            {totalDutyReqs > 0 && ` • ${totalDutyReqs} duty requests`}
            {totalLimitsSet > 0 && ` • ${totalLimitsSet} duty limits`}
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={handleGenerate}>
          ⚡ Generate & View Calendar
        </button>
      </section>
    </div>
  );
}
