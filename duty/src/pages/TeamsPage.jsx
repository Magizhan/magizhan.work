import { useState, useRef } from 'react';
import { useRota } from '../context/RotaContext';
import DoctorBadge from '../components/DoctorBadge';
import './TeamsPage.css';

export default function TeamsPage() {
  const {
    activeTeam,
    teams,
    activeTeamId,
    setActiveTeam,
    createTeam,
    deleteTeam,
    addDoctor,
    removeDoctor,
    exportData,
    importData,
  } = useRota();

  const [newTeamName, setNewTeamName] = useState('');
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorInitials, setNewDoctorInitials] = useState('');
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInputRef = useRef(null);

  const teamList = Object.values(teams);

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    createTeam(newTeamName.trim());
    setNewTeamName('');
  };

  const handleAddDoctor = () => {
    if (!newDoctorName.trim() || !newDoctorInitials.trim()) return;
    addDoctor(newDoctorName.trim(), newDoctorInitials.trim());
    setNewDoctorName('');
    setNewDoctorInitials('');
    setShowAddDoctor(false);
  };

  const handleRemoveDoctor = (id) => {
    if (confirmDelete === id) {
      removeDoctor(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const success = importData(ev.target.result);
      if (!success) alert('Invalid file format');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="teams-page">
      {/* Team Management */}
      <section className="card">
        <h2 className="card-title">Teams</h2>
        <div className="team-list">
          {teamList.map((team) => (
            <div
              key={team.id}
              className={`team-item ${team.id === activeTeamId ? 'active' : ''}`}
              onClick={() => setActiveTeam(team.id)}
            >
              <div className="team-info">
                <span className="team-name">{team.name}</span>
                <span className="team-count">{team.doctors.length} doctors</span>
              </div>
              <div className="team-actions">
                {team.id !== 'default' && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTeam(team.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="add-team-row">
          <input
            type="text"
            className="input"
            placeholder="New team name…"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreateTeam}>
            + Add Team
          </button>
        </div>
      </section>

      {/* Data Import/Export */}
      <section className="card">
        <h2 className="card-title">Data Sharing</h2>
        <p className="card-subtitle">Export team data as JSON to share with others, or import a shared file.</p>
        <div className="data-actions">
          <button className="btn btn-secondary" onClick={exportData}>
            📤 Export Team Data
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            📥 Import Team Data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
      </section>

      {/* Doctor Management */}
      <section className="card">
        <div className="card-header-row">
          <h2 className="card-title">
            Doctors — <span className="card-title-accent">{activeTeam.name}</span>
          </h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddDoctor(!showAddDoctor)}
          >
            {showAddDoctor ? 'Cancel' : '+ Add Doctor'}
          </button>
        </div>

        {showAddDoctor && (
          <div className="add-doctor-form">
            <input
              type="text"
              className="input"
              placeholder="Full name"
              value={newDoctorName}
              onChange={(e) => setNewDoctorName(e.target.value)}
            />
            <input
              type="text"
              className="input input-sm"
              placeholder="Initials"
              maxLength={3}
              value={newDoctorInitials}
              onChange={(e) => setNewDoctorInitials(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDoctor()}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddDoctor}>
              Add
            </button>
          </div>
        )}

        <div className="doctor-list">
          {activeTeam.doctors.length === 0 && (
            <p className="no-doctors">No doctors yet. Add one above.</p>
          )}
          {activeTeam.doctors.map((doc) => (
            <div key={doc.id} className="doctor-item">
              <DoctorBadge initials={doc.initials} color={doc.color} name={doc.name} size="lg" />
              <span className="doctor-name">{doc.name}</span>
              <button
                className={`btn btn-sm ${confirmDelete === doc.id ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => handleRemoveDoctor(doc.id)}
              >
                {confirmDelete === doc.id ? 'Confirm?' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
