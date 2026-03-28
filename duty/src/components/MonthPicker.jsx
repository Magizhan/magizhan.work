import { MONTH_NAMES } from '../constants/defaults';
import './MonthPicker.css';

export default function MonthPicker({ month, year, onChange }) {
  const handlePrev = () => {
    if (month === 0) onChange(11, year - 1);
    else onChange(month - 1, year);
  };

  const handleNext = () => {
    if (month === 11) onChange(0, year + 1);
    else onChange(month + 1, year);
  };

  return (
    <div className="month-picker">
      <button className="mp-btn" onClick={handlePrev} aria-label="Previous month">
        ‹
      </button>
      <div className="mp-display">
        <span className="mp-month">{MONTH_NAMES[month]}</span>
        <span className="mp-year">{year}</span>
      </div>
      <button className="mp-btn" onClick={handleNext} aria-label="Next month">
        ›
      </button>
    </div>
  );
}
