import React, { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  Sparkles,
  CheckCircle,
  WifiOff,
  Zap,
  Bell,
  X,
  Globe,
} from "lucide-react";
import "./InstallAppModal.css";

export default function InstallAppModal({
  isOpen,
  onClose,
  deferredInstallPrompt = null
}) {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isIosDevice);

      const isInStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
      setIsStandalone(isInStandalone);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handle1TapInstall = async () => {
    if (deferredInstallPrompt) {
      try {
        setIsInstalling(true);
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          setInstallSuccess(true);
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Fallback message for browsers where prompt was dismissed or auto-handled
      alert("To install on your browser, tap the browser menu (⋮ or Share) and select 'Install app' or 'Add to Home screen'.");
    }
  };

  return (
    <div className="install-modal-overlay" onClick={onClose}>
      <div className="install-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="install-modal-header">
          <div className="install-modal-title-group">
            <div className="install-icon-badge">
              <Smartphone size={22} color="#4f46e5" />
            </div>
            <div>
              <h2 className="install-modal-title">Download & Install App</h2>
              <p className="install-modal-subtitle">
                Use Smart Notes on any phone, tablet, or PC like a native app.
              </p>
            </div>
          </div>
          <button type="button" className="install-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Standalone Success State */}
        {isStandalone ? (
          <div className="install-standalone-banner">
            <CheckCircle size={24} color="#10b981" />
            <div>
              <div className="install-standalone-title">App is Already Installed! 🎉</div>
              <div className="install-standalone-desc">
                You are currently running the full-screen standalone version of Smart Notes.
              </div>
            </div>
          </div>
        ) : (
          <div className="install-content-body">
            {/* Direct 1-Tap or iOS Guide */}
            {isIOS ? (
              /* iOS Safari Visual Guide */
              <div className="install-ios-guide">
                <div className="install-platform-badge ios">
                  <Smartphone size={14} /> Apple iOS (iPhone & iPad Safari)
                </div>
                <h4 className="install-guide-heading">How to Install on iPhone:</h4>

                <div className="install-steps-list">
                  <div className="install-step-item">
                    <div className="install-step-num">1</div>
                    <div className="install-step-icon">
                      <Share size={18} color="#007aff" />
                    </div>
                    <div className="install-step-text">
                      Tap the <strong>Share</strong> button at the bottom of Safari.
                    </div>
                  </div>

                  <div className="install-step-item">
                    <div className="install-step-num">2</div>
                    <div className="install-step-icon">
                      <PlusSquare size={18} color="#007aff" />
                    </div>
                    <div className="install-step-text">
                      Scroll down and tap <strong>"Add to Home Screen"</strong>.
                    </div>
                  </div>

                  <div className="install-step-item">
                    <div className="install-step-num">3</div>
                    <div className="install-step-icon">
                      <CheckCircle size={18} color="#10b981" />
                    </div>
                    <div className="install-step-text">
                      Tap <strong>"Add"</strong> in the top-right corner to finish!
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Android / Chrome 1-Tap Install */
              <div className="install-android-box">
                <div className="install-platform-badge android">
                  <Globe size={14} /> Android, Chrome & Desktop
                </div>

                <div className="install-1tap-hero">
                  <div className="install-hero-icon">
                    <Download size={32} />
                  </div>
                  <div className="install-hero-info">
                    <div className="install-hero-title">1-Tap Fast Installation</div>
                    <div className="install-hero-desc">
                      Add to your home screen or desktop with a single click.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="install-hero-btn"
                  onClick={handle1TapInstall}
                  disabled={isInstalling || installSuccess}
                >
                  <Download size={18} />
                  <span>
                    {installSuccess 
                      ? "Installed Successfully! 🎉" 
                      : isInstalling 
                        ? "Installing..." 
                        : "Install App on Phone / PC"}
                  </span>
                </button>
              </div>
            )}

            {/* Benefits List */}
            <div className="install-benefits-box">
              <h5 className="install-benefits-title">Why Install as an App?</h5>
              <div className="install-benefits-grid">
                <div className="install-benefit-item">
                  <WifiOff size={16} color="#10b981" />
                  <div>
                    <strong>100% Offline Capable</strong>
                    <span>Use on planes, subway or anywhere without signal</span>
                  </div>
                </div>

                <div className="install-benefit-item">
                  <Zap size={16} color="#f59e0b" />
                  <div>
                    <strong>Ultra-Fast Fullscreen</strong>
                    <span>No browser URL bar or clutter — feels native</span>
                  </div>
                </div>

                <div className="install-benefit-item">
                  <Bell size={16} color="#8b5cf6" />
                  <div>
                    <strong>Native Reminders</strong>
                    <span>Timely alerts and chime sound notifications</span>
                  </div>
                </div>

                <div className="install-benefit-item">
                  <Sparkles size={16} color="#ec4899" />
                  <div>
                    <strong>Home Screen Icon</strong>
                    <span>Instant 1-tap launch anytime from your phone</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="install-modal-footer">
          <button type="button" className="install-done-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
