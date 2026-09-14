/**
 * Cross-Platform System Notification Service (PC & Mobile)
 */

export async function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      return reg;
    } catch (err) {
      console.warn("ServiceWorker registration note:", err);
    }
  }
  return null;
}

export function getNotificationPermissionStatus() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission; // "default", "granted", "denied"
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      registerServiceWorker().catch(() => {});
    }
    return permission;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return "denied";
  }
}

export async function sendNativeNotification(title, options = {}) {
  // Mobile vibration feedback
  if (typeof navigator !== "undefined" && "vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {
      // Ignore vibration error
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const notificationOptions = {
    body: options.body || "Your scheduled task reminder is due.",
    icon: options.icon || "/logo192.png",
    badge: "/favicon.ico",
    tag: options.tag || "note-reminder-" + Date.now(),
    renotify: true,
    requireInteraction: true,
    ...options,
  };

  // 1. Try direct Desktop Notification constructor first (synchronous on Windows/Mac/Linux/Desktop Chrome/Edge/Firefox/Safari)
  try {
    const notif = new Notification(title, notificationOptions);
    if (options.onClick) {
      notif.onclick = options.onClick;
    }
    return true;
  } catch (err) {
    // Android Chrome throws: TypeError: Failed to construct 'Notification': Illegal constructor.
    // In that case, fall through to ServiceWorkerRegistration.showNotification
    console.log("Direct new Notification failed, falling back to ServiceWorker:", err);
  }

  // 2. Fallback to Service Worker showNotification (Required on Android Chrome & Mobile PWA)
  if ("serviceWorker" in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js");
      }
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn("ServiceWorker showNotification fallback failed:", swErr);
    }
  }

  return false;
}

let globalAudioCtx = null;
export function playMelodicChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!globalAudioCtx) {
      globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume().catch(() => {});
    }

    const now = globalAudioCtx.currentTime;
    const notes = [
      { freq: 659.25, time: 0.0, duration: 0.45 },
      { freq: 830.61, time: 0.16, duration: 0.45 },
      { freq: 987.77, time: 0.32, duration: 0.55 },
      { freq: 1318.51, time: 0.48, duration: 0.85 },
    ];

    notes.forEach((note) => {
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0.001, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.25, now + note.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.duration + 0.05);
    });
  } catch (e) {
    console.warn("Audio Context chime failed:", e);
  }
}
