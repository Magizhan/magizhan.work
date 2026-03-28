import './DoctorBadge.css';

export default function DoctorBadge({ initials, color, name, size = 'md' }) {
  return (
    <span
      className={`doctor-badge doctor-badge-${size}`}
      style={{ '--doctor-color': color }}
      title={name}
    >
      {initials}
    </span>
  );
}
