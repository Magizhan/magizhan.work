import { NavLink } from 'react-router-dom';
import { useRota } from '../context/RotaContext';
import './Navbar.css';

const NAV_LINKS = [
  { to: '/', label: 'Calendar', icon: '📅' },
  { to: '/teams', label: 'Teams', icon: '👥' },
  { to: '/requests', label: 'Requests', icon: '📋' },
];

export default function Navbar() {
  const { activeTeam, teams, setActiveTeam } = useRota();
  const teamList = Object.values(teams);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">⚕️</span>
        <h1 className="navbar-title">Duty Rota</h1>
      </div>

      <div className="navbar-links">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </NavLink>
        ))}
      </div>

      {teamList.length > 1 && (
        <div className="navbar-team-selector">
          <select
            value={activeTeam.id}
            onChange={(e) => setActiveTeam(e.target.value)}
            className="team-select"
          >
            {teamList.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </nav>
  );
}
