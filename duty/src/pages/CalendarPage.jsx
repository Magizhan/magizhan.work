import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useRota } from '../context/RotaContext';
import { DAY_LABELS } from '../constants/defaults';
import MonthPicker from '../components/MonthPicker';
import StatsPanel from '../components/StatsPanel';
import DoctorBadge from '../components/DoctorBadge';
import SwapConfirmModal from '../components/SwapConfirmModal';
import CalendarSyncPanel from '../components/CalendarSyncPanel';
import { validateSwap } from '../utils/swapValidator';
import './CalendarPage.css';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const { activeTeam, setMonthYear, generate, swapAssignments } = useRota();
  const calRef = useRef(null);
  const fullRef = useRef(null);
  const { selectedMonth: month, selectedYear: year, doctors, generatedRota, holidays, leaveRequests } = activeTeam;

  const [selectedCell, setSelectedCell] = useState(null);
  const [swapModal, setSwapModal] = useState(null); // { source, target, warnings }

  const handleMonthChange = useCallback(
    (m, y) => setMonthYear(m, y),
    [setMonthYear]
  );

  const handleGenerate = useCallback(() => {
    setSelectedCell(null);
    generate();
  }, [generate]);

  const handleDownload = useCallback(async (ref, suffix = '') => {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, {
        backgroundColor: '#f9fafb',
        pixelRatio: 2,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `duty_rota_${year}_${month + 1}${suffix}.png`;
      a.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [year, month]);

  const handleCellClick = useCallback((cell) => {
    if (!cell.doctor || !generatedRota) return;

    if (!selectedCell) {
      setSelectedCell(cell);
      return;
    }

    if (selectedCell.day === cell.day) {
      setSelectedCell(null);
      return;
    }

    // Validate the swap
    const warnings = validateSwap(
      generatedRota.assignments,
      selectedCell.day,
      cell.day,
      leaveRequests || {},
      holidays,
      doctors,
    );

    setSwapModal({
      source: selectedCell,
      target: cell,
      warnings,
    });
  }, [selectedCell, generatedRota, leaveRequests, holidays, doctors]);

  const handleSwapConfirm = useCallback(() => {
    if (!swapModal) return;
    swapAssignments(swapModal.source.day, swapModal.target.day);
    setSwapModal(null);
    setSelectedCell(null);
  }, [swapModal, swapAssignments]);

  const handleSwapCancel = useCallback(() => {
    setSwapModal(null);
    setSelectedCell(null);
  }, []);

  const totalDays = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const assignments = generatedRota?.assignments || [];
  const stats = generatedRota?.stats || {};

  // Build lookup: day number → assignment
  const assignmentMap = {};
  assignments.forEach((a) => {
    assignmentMap[a.day] = a;
  });

  // Build holiday lookup
  const holidayMap = {};
  holidays.forEach((h) => {
    const parts = h.date.split('-');
    const hYear = parseInt(parts[0]);
    const hMonth = parseInt(parts[1]) - 1;
    const hDay = parseInt(parts[2]);
    if (hYear === year && hMonth === month) {
      holidayMap[hDay] = h.name;
    }
  });

  // Build calendar grid cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ empty: true, key: `empty-${i}` });
  }
  for (let day = 1; day <= totalDays; day++) {
    const dow = new Date(year, month, day).getDay();
    const assignment = assignmentMap[day];
    const holidayName = holidayMap[day];
    const isSunday = dow === 0;
    const isFriday = dow === 5;
    const isSaturday = dow === 6;
    const isHoliday = !!holidayName;
    const doctor = assignment ? doctors.find((d) => d.id === assignment.doctorId) : null;

    cells.push({
      empty: false,
      key: `day-${day}`,
      day,
      isSunday,
      isFriday,
      isSaturday,
      isHoliday,
      holidayName,
      doctor,
      assignment,
    });
  }

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <MonthPicker month={month} year={year} onChange={handleMonthChange} />
        <div className="calendar-actions">
          <button className="btn btn-primary" onClick={handleGenerate}>
            {generatedRota ? '🔄 Regenerate' : '⚡ Generate Rota'}
          </button>
          {generatedRota && (
            <>
              <button className="btn btn-secondary" onClick={() => handleDownload(calRef)}>
                📥 Calendar
              </button>
              <button className="btn btn-secondary" onClick={() => handleDownload(fullRef, '_full')}>
                📥 Full Report
              </button>
            </>
          )}
        </div>
      </div>

      {doctors.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">👥</span>
          <p>No doctors in this team. Go to <strong>Teams</strong> to add doctors first.</p>
        </div>
      )}

      {selectedCell && (
        <div className="swap-hint">
          Swapping <strong>{selectedCell.doctor?.name}</strong> (day {selectedCell.day}) — click another doctor to swap, or click same cell to cancel
        </div>
      )}

      <div className="calendar-full-export" ref={fullRef}>
        <div className="calendar-content" ref={calRef}>
          <div className="calendar-grid-wrapper">
            <div className="calendar-team-label">{activeTeam.name}</div>
            <div className="calendar-grid">
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  className={`calendar-day-header ${label === 'Sun' ? 'sunday' : ''} ${label === 'Fri' || label === 'Sat' ? 'weekend' : ''}`}
                >
                  {label}
                </div>
              ))}
              {cells.map((cell) => {
                if (cell.empty) return <div key={cell.key} className="calendar-cell empty" />;

                const isSelected = selectedCell?.day === cell.day;
                const isSwappable = selectedCell && !isSelected && cell.doctor;

                const cellClasses = [
                  'calendar-cell',
                  cell.isSunday ? 'sunday' : '',
                  cell.isHoliday ? 'holiday' : '',
                  cell.isFriday ? 'friday' : '',
                  cell.isSaturday ? 'saturday' : '',
                  isSelected ? 'selected' : '',
                  isSwappable ? 'swappable' : '',
                  cell.doctor ? 'has-doctor' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div
                    key={cell.key}
                    className={cellClasses}
                    onClick={() => handleCellClick(cell)}
                  >
                    <span className="cell-date">{cell.day}</span>
                    {cell.isHoliday && (
                      <span className="cell-holiday-tag">{cell.holidayName}</span>
                    )}
                    {cell.doctor ? (
                      <DoctorBadge
                        initials={cell.doctor.initials}
                        color={cell.doctor.color}
                        name={cell.doctor.name}
                        size="md"
                      />
                    ) : cell.assignment?.doctorInitials === '—' ? (
                      <span className="cell-no-doctor">—</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {generatedRota && <StatsPanel stats={stats} doctors={doctors} />}
      </div>

      {generatedRota && (
        <CalendarSyncPanel
          assignments={assignments}
          doctors={doctors}
          teamName={activeTeam.name}
          year={year}
          month={month}
        />
      )}

      {swapModal && (
        <SwapConfirmModal
          source={swapModal.source}
          target={swapModal.target}
          warnings={swapModal.warnings}
          onConfirm={handleSwapConfirm}
          onCancel={handleSwapCancel}
        />
      )}
    </div>
  );
}
