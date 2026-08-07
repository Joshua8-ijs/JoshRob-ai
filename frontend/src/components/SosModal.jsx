import { useState } from "react";

import { api } from "../services/api.js";

export default function SosModal({ location, onClose }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  async function raiseSos() {
    if (!location) {
      setResult({ error: "Your location isn't available yet. Please allow GPS access." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await api.emergency.sos({
        lat: location.lat,
        lng: location.lng,
        message,
      });
      setResult(res);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h2>🚨 Emergency SOS</h2>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {result ? (
          <div className="modal-body">
            {result.error ? (
              <p className="alert alert-danger">{result.error}</p>
            ) : (
              <>
                <p className="alert alert-success">
                  SOS #{result.alert_id} registered and your emergency contact has been notified.
                </p>
                <p>
                  <strong>Location:</strong> {result.address}
                </p>
                {result.nearest_help?.length > 0 && (
                  <>
                    <p>
                      <strong>Nearest help:</strong>
                    </p>
                    <ul className="help-list">
                      {result.nearest_help.map((h, i) => (
                        <li key={i}>
                          {h.name} · {h.phone || "no phone on record"}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="muted">{result.instruction}</p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-primary" onClick={onClose}>
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="modal-body">
            <p>
              This sends your live coordinates to the JoshRob emergency service. Add extra details
              if you can.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional — describe your situation…"
              rows={3}
              maxLength={500}
            />
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={sending}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={raiseSos}
                disabled={sending}
              >
                {sending ? "Sending…" : "Raise SOS now"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
