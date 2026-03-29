import './SwapConfirmModal.css';

export default function SwapConfirmModal({ source, target, warnings, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Swap Confirmation</h3>
        <div className="swap-summary">
          <div className="swap-item">
            <span className="swap-day">Day {source.day}</span>
            <span className="swap-doctor">{source.doctor?.name}</span>
          </div>
          <span className="swap-arrow">⇄</span>
          <div className="swap-item">
            <span className="swap-day">Day {target.day}</span>
            <span className="swap-doctor">{target.doctor?.name}</span>
          </div>
        </div>

        {warnings.length > 0 ? (
          <div className="swap-warnings">
            <p className="warnings-label">Constraint warnings:</p>
            <ul className="warnings-list">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="swap-ok">No conflicts detected.</p>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>
            {warnings.length > 0 ? 'Swap Anyway' : 'Swap'}
          </button>
        </div>
      </div>
    </div>
  );
}
