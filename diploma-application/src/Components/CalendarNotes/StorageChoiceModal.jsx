import React, { useState, useEffect } from "react";
import { 
  Smartphone, 
  Cloud, 
  Check, 
  Download, 
  Upload, 
  HardDrive, 
  RefreshCw, 
  X,
  LogOut
} from "lucide-react";
import { 
  getStorageDestination, 
  setStorageDestination, 
  getLastSyncTime, 
  downloadWorkspaceBackup, 
  restoreWorkspaceData,
  setGoogleDriveToken,
  getGoogleDriveUserEmail,
  pushWorkspaceToGoogleDrive,
  pullWorkspaceFromGoogleDrive,
  loginWithGoogleOAuth
} from "../../utils/googleDriveService";
import { getStorageQuotaEstimate } from "../../utils/indexedDbService";
import "./StorageChoiceModal.css";

export default function StorageChoiceModal({ isOpen, onClose, onStorageSelected }) {
  const [selectedDestination, setSelectedDestination] = useState("phone");
  const [lastSync, setLastSync] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [quota, setQuota] = useState({ usedFormatted: "Calculating...", totalFormatted: "Unlimited SSD", percentUsed: "0" });
  const [isSyncing, setIsSyncing] = useState(false);
  const [gdriveEmail, setGdriveEmail] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const current = getStorageDestination() || "phone";
      setSelectedDestination(current);
      setLastSync(getLastSyncTime());
      setGdriveEmail(getGoogleDriveUserEmail());

      getStorageQuotaEstimate().then(setQuota);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectChoice = (dest) => {
    setSelectedDestination(dest);
    setStorageDestination(dest);
    if (onStorageSelected) onStorageSelected(dest);
  };

  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    const res = await pushWorkspaceToGoogleDrive();
    setIsSyncing(false);
    if (res.success) {
      setLastSync(new Date().toISOString());
      setStatusMessage({ type: "success", text: "☁️ All notes synced to Google Drive successfully!" });
    } else {
      setStatusMessage({ type: "error", text: "Cloud sync failed. Verify internet connection." });
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleManualPullNow = async () => {
    setIsSyncing(true);
    const res = await pullWorkspaceFromGoogleDrive();
    setIsSyncing(false);
    if (res.success) {
      setLastSync(new Date().toISOString());
      setStatusMessage({ type: "success", text: "✅ Downloaded latest notes from Google Drive!" });
    } else {
      setStatusMessage({ type: "error", text: "No cloud backup found on Google Drive yet." });
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleGoogleSignIn = async () => {
    try {
      const auth = await loginWithGoogleOAuth();
      if (auth && auth.email) {
        setGdriveEmail(auth.email);
        setStatusMessage({ type: "success", text: `✅ Signed in as ${auth.email}! Cloud sync active.` });
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.warn("Google sign-in error:", err);
      setStatusMessage({ type: "error", text: err.message || "Sign-in cancelled." });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleDriveToken(null);
    setGdriveEmail(null);
    setStatusMessage({ type: "info", text: "Disconnected from Google Account." });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleFileRestore = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const ok = await restoreWorkspaceData(parsed);
        if (ok) {
          setStatusMessage({ type: "success", text: "✅ Workspace restored successfully!" });
        } else {
          setStatusMessage({ type: "error", text: "Failed to restore backup file." });
        }
      } catch (err) {
        setStatusMessage({ type: "error", text: "Invalid JSON backup file." });
      }
      setTimeout(() => setStatusMessage(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="storage-modal-overlay" onClick={onClose}>
      <div className="storage-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="storage-modal-header">
          <div className="storage-modal-title-group">
            <div className="storage-icon-badge">
              <HardDrive size={20} color="#10b981" />
            </div>
            <div>
              <h3 className="storage-modal-title">Storage & Cloud Sync Engine</h3>
              <p className="storage-modal-sub">
                Unlimited Local IndexedDB & Real-Time Google Drive Sync
              </p>
            </div>
          </div>
          <button type="button" className="storage-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {statusMessage && (
          <div className={`storage-status-banner storage-status-banner--${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        )}

        {/* Live Disk Quota Bar */}
        <div className="storage-quota-card">
          <div className="storage-quota-header">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <HardDrive size={14} color="#10b981" />
              <span style={{ fontWeight: 600, fontSize: "12.5px" }}>Local IndexedDB Storage</span>
            </div>
            <span style={{ fontSize: "11.5px", color: "var(--notion-secondary, #787774)", fontWeight: 500 }}>
              {quota.usedFormatted} used of {quota.totalFormatted}
            </span>
          </div>
          <div className="storage-quota-track">
            <div className="storage-quota-fill" style={{ width: Math.max(parseFloat(quota.percentUsed || 0), 2) + "%" }} />
          </div>
          <span style={{ fontSize: "11px", color: "var(--notion-secondary, #787774)" }}>
            ⚡ Stores unlimited notes, diagrams and PDF files without 5MB limits.
          </span>
        </div>

        {/* Choice Grid */}
        <div className="storage-options-grid">
          {/* Choice 1: Local Device */}
          <div
            className={`storage-option-card ${selectedDestination === "phone" ? "is-selected" : ""}`}
            onClick={() => handleSelectChoice("phone")}
          >
            <div className="storage-option-radio">
              {selectedDestination === "phone" && <Check size={12} />}
            </div>
            <div className="storage-option-icon storage-option-icon--phone">
              <Smartphone size={22} color="#10b981" />
            </div>
            <div className="storage-option-content">
              <div className="storage-option-title-row">
                <h4 className="storage-option-title">Local Device (IndexedDB)</h4>
                <span className="storage-option-badge">Unlimited SSD</span>
              </div>
              <p className="storage-option-desc">
                High-speed offline database stored directly on your PC / Phone. Zero latency.
              </p>
            </div>
          </div>

          {/* Choice 2: Google Drive Auto-Sync */}
          <div
            className={`storage-option-card ${selectedDestination === "gdrive" ? "is-selected-cloud" : ""}`}
            onClick={() => handleSelectChoice("gdrive")}
          >
            <div className="storage-option-radio">
              {selectedDestination === "gdrive" && <Check size={12} />}
            </div>
            <div className="storage-option-icon storage-option-icon--cloud">
              <Cloud size={22} color="#3b82f6" />
            </div>
            <div className="storage-option-content">
              <div className="storage-option-title-row">
                <h4 className="storage-option-title">Google Drive (Auto-Sync)</h4>
                <span className="storage-option-badge storage-option-badge--cloud">Real-Time Cloud</span>
              </div>
              <p className="storage-option-desc">
                Automatically syncs every note in the background between your PC and mobile device.
              </p>
            </div>
          </div>
        </div>

        {/* Google Account Sign-In Card */}
        {selectedDestination === "gdrive" && (
          <div className="storage-gdrive-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 34, height: 34, borderRadius: "8px", background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                  <Cloud size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>
                    {gdriveEmail ? `Google Account: ${gdriveEmail}` : "Google Account Connection"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--notion-secondary, #787774)" }}>
                    {gdriveEmail 
                      ? (lastSync ? `Last synced: ${new Date(lastSync).toLocaleTimeString()}` : "Auto-syncs every note change")
                      : "Sign in with Google to enable automatic cloud sync"}
                  </div>
                </div>
              </div>

              {gdriveEmail ? (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="storage-gdrive-sync-btn"
                    onClick={handleManualSyncNow}
                    disabled={isSyncing}
                  >
                    <RefreshCw size={12} className={isSyncing ? "spin-icon" : ""} />
                    <span>{isSyncing ? "Syncing..." : "Push Now"}</span>
                  </button>
                  <button
                    type="button"
                    className="storage-gdrive-sync-btn"
                    onClick={handleManualPullNow}
                    disabled={isSyncing}
                  >
                    <Download size={12} />
                    <span>Pull</span>
                  </button>
                  <button
                    type="button"
                    className="storage-gdrive-disconnect-btn"
                    onClick={handleDisconnectGoogle}
                    title="Sign Out of Google"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="storage-google-signin-btn"
                  onClick={handleGoogleSignIn}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="storage-modal-footer">
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={downloadWorkspaceBackup}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "1px solid #cbd5e1",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                color: "var(--notion-text, #1e293b)"
              }}
            >
              <Download size={13} /> JSON Backup
            </button>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "1px solid #cbd5e1",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                color: "var(--notion-text, #1e293b)"
              }}
            >
              <Upload size={13} /> Restore
              <input type="file" accept=".json" onChange={handleFileRestore} style={{ display: "none" }} />
            </label>
          </div>

          <button type="button" className="storage-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
