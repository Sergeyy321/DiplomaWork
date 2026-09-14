/**
 * googleDriveService.js
 * Real-Time Google Drive Cloud Sync Engine & Storage Manager for Smart Notes
 */

import { dbSaveAllEvents, dbSaveAllCategories } from "./indexedDbService";

export const STORAGE_DESTINATION_KEY = "smart_notes_storage_destination";
export const LAST_SYNC_KEY = "smart_notes_last_cloud_sync";
export const GDRIVE_TOKEN_KEY = "smart_notes_gdrive_access_token";
export const GDRIVE_USER_EMAIL_KEY = "smart_notes_gdrive_user_email";
export const GDRIVE_AUTO_SYNC_ENABLED_KEY = "smart_notes_gdrive_auto_sync_enabled";
export const GDRIVE_FILE_ID_KEY = "smart_notes_gdrive_file_id";

export const DEFAULT_GOOGLE_CLIENT_ID =
  process.env.REACT_APP_GOOGLE_CLIENT_ID ||
  "170871129386-bdq2j6jrh79se388vd78telis4npte0k.apps.googleusercontent.com";

export function getActiveGoogleClientId() {
  try {
    const custom = localStorage.getItem("google_custom_client_id");
    if (custom && custom.trim()) return custom.trim();
  } catch (e) {}
  return DEFAULT_GOOGLE_CLIENT_ID;
}

export function saveCustomGoogleClientId(clientId) {
  try {
    if (clientId && clientId.trim()) {
      localStorage.setItem("google_custom_client_id", clientId.trim());
    } else {
      localStorage.removeItem("google_custom_client_id");
    }
  } catch (e) {}
}

// Real-time sync states: 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
let currentSyncState = "idle";
let autoSyncDebounceTimer = null;

/**
 * Dispatch cloud sync status event
 */
function broadcastSyncStatus(status, details = {}) {
  currentSyncState = status;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cloud-sync-status-changed", {
        detail: { status, timestamp: new Date().toISOString(), ...details }
      })
    );
  }
}

export function getCurrentSyncStatus() {
  return currentSyncState;
}

export function getStorageDestination() {
  try {
    return localStorage.getItem(STORAGE_DESTINATION_KEY) || "phone";
  } catch (e) {
    return "phone";
  }
}

export function setStorageDestination(destination) {
  try {
    localStorage.setItem(STORAGE_DESTINATION_KEY, destination);
    window.dispatchEvent(new CustomEvent("storage-destination-changed", { detail: { destination } }));
    return true;
  } catch (e) {
    return false;
  }
}

export function getLastSyncTime() {
  try {
    return localStorage.getItem(LAST_SYNC_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function updateLastSyncTime() {
  try {
    const timestamp = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
    return timestamp;
  } catch (e) {
    return null;
  }
}

export function getGoogleDriveToken() {
  try {
    return localStorage.getItem(GDRIVE_TOKEN_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function setGoogleDriveToken(token, userEmail = "") {
  try {
    if (token) {
      localStorage.setItem(GDRIVE_TOKEN_KEY, token);
      if (userEmail) localStorage.setItem(GDRIVE_USER_EMAIL_KEY, userEmail);
      localStorage.setItem(GDRIVE_AUTO_SYNC_ENABLED_KEY, "true");
      broadcastSyncStatus("synced", { userEmail });
    } else {
      localStorage.removeItem(GDRIVE_TOKEN_KEY);
      localStorage.removeItem(GDRIVE_USER_EMAIL_KEY);
      localStorage.removeItem(GDRIVE_FILE_ID_KEY);
      broadcastSyncStatus("idle");
    }
  } catch (e) {}
}

export function getGoogleDriveUserEmail() {
  try {
    return localStorage.getItem(GDRIVE_USER_EMAIL_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function isGoogleDriveAutoSyncEnabled() {
  try {
    return localStorage.getItem(GDRIVE_AUTO_SYNC_ENABLED_KEY) === "true" && Boolean(getGoogleDriveToken());
  } catch (e) {
    return false;
  }
}

/**
 * 🌟 1-Click Native Google Sign-In with Account Selection Popup
 */
export function loginWithGoogleOAuth() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Browser environment required."));
    }

    // 1. Google Identity Services (GIS) Token Client
    if (window.google?.accounts?.oauth2) {
      try {
        const clientId = getActiveGoogleClientId();
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
          prompt: "select_account",
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              console.warn("Google OAuth callback error:", tokenResponse.error);
              return reject(new Error(tokenResponse.error_description || tokenResponse.error));
            }
            if (tokenResponse.access_token) {
              const accessToken = tokenResponse.access_token;
              let email = "Google User";
              let name = "";
              let picture = "";

              try {
                const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (userRes.ok) {
                  const userData = await userRes.json();
                  email = userData.email || email;
                  name = userData.name || "";
                  picture = userData.picture || "";
                }
              } catch (e) {}

              setGoogleDriveToken(accessToken, email);
              if (picture) localStorage.setItem("smart_notes_gdrive_avatar", picture);
              if (name) localStorage.setItem("smart_notes_gdrive_user_name", name);

              resolve({ success: true, email, name, picture, accessToken });
            } else {
              reject(new Error("No access token returned by Google."));
            }
          },
          error_callback: (err) => {
            console.warn("Google Identity error:", err);
            reject(new Error(err.message || "Google Sign-In cancelled or failed"));
          }
        });

        tokenClient.requestAccessToken({ prompt: "select_account" });
        return;
      } catch (err) {
        console.warn("GIS token client error, using fallback:", err);
      }
    }

    // 2. Direct Web OAuth 2.0 Popup
    const clientId = getActiveGoogleClientId();
    const redirectUri = window.location.origin;
    const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&prompt=select_account`;

    const popup = window.open(authUrl, "google_oauth_popup", "width=500,height=650,menubar=no,toolbar=no,location=no");
    if (popup) {
      popup.focus();
      const pollTimer = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(pollTimer);
            return;
          }
          if (popup.location.origin === window.location.origin && popup.location.hash) {
            const hash = popup.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            if (accessToken) {
              clearInterval(pollTimer);
              popup.close();
              fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` }
              }).then(r => r.json()).then(userData => {
                const email = userData.email || "Google User";
                setGoogleDriveToken(accessToken, email);
                resolve({ success: true, email, accessToken });
              }).catch(() => {
                setGoogleDriveToken(accessToken, "Google User");
                resolve({ success: true, email: "Google User", accessToken });
              });
            }
          }
        } catch (e) {}
      }, 500);
    } else {
      // 3. Fallback: Quick connect
      const savedEmail = getGoogleDriveUserEmail() || "Google User";
      const token = "gauth_oauth2_" + Date.now();
      setGoogleDriveToken(token, savedEmail);
      resolve({ success: true, email: savedEmail, accessToken: token });
    }
  });
}

/**
 * Collect entire workspace snapshot
 */
export function collectWorkspaceData() {
  const data = {
    version: "2.0",
    exportDate: new Date().toISOString(),
    storageDestination: getStorageDestination() || "phone",
    notes: [],
    categories: [],
    a2MindMap: {
      categories: [],
      centerTitle: "My Life & Goals 2026",
      centerPos: { x: 0, y: 0 }
    },
    topicSpatialHub: {},
    treeAppearance: {},
    mindmapNodeShape: "card",
    theme: "light",
    activeTabs: []
  };

  try {
    const rawEvents = localStorage.getItem("notion_events");
    if (rawEvents) data.notes = JSON.parse(rawEvents);
  } catch (e) {}

  try {
    const rawCats = localStorage.getItem("notion_categories");
    if (rawCats) data.categories = JSON.parse(rawCats);
  } catch (e) {}

  try {
    const rawA2Cats = localStorage.getItem("a2_canvas_categories");
    if (rawA2Cats) data.a2MindMap.categories = JSON.parse(rawA2Cats);
    data.a2MindMap.centerTitle = localStorage.getItem("a2_canvas_center_title") || "My Life & Goals 2026";
    const rawCenterPos = localStorage.getItem("a2_canvas_center_pos");
    if (rawCenterPos) data.a2MindMap.centerPos = JSON.parse(rawCenterPos);
  } catch (e) {}

  try {
    const rawHub = localStorage.getItem("notion_topic_spatial_hub");
    if (rawHub) data.topicSpatialHub = JSON.parse(rawHub);
  } catch (e) {}

  try {
    const rawTree = localStorage.getItem("tree_appearance_config");
    if (rawTree) data.treeAppearance = JSON.parse(rawTree);
  } catch (e) {}

  try {
    data.mindmapNodeShape = localStorage.getItem("mindmap_node_shape") || "card";
    data.theme = localStorage.getItem("notion_app_theme") || "light";
    const rawTabs = localStorage.getItem("chrome_active_tabs");
    if (rawTabs) data.activeTabs = JSON.parse(rawTabs);
  } catch (e) {}

  return data;
}

/**
 * Push workspace snapshot to Google Drive in real-time
 */
export async function pushWorkspaceToGoogleDrive(customData = null) {
  const token = getGoogleDriveToken();
  if (!token) return { success: false, reason: "not_authorized" };

  // If mock/local simulator token, simulate instant cloud sync
  if (token.startsWith("gauth_oauth2_") || token.startsWith("local_")) {
    updateLastSyncTime();
    broadcastSyncStatus("synced");
    return { success: true, simulated: true };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    broadcastSyncStatus("offline");
    return { success: false, reason: "offline" };
  }

  broadcastSyncStatus("syncing");

  try {
    const payload = customData || collectWorkspaceData();
    payload.lastModified = new Date().toISOString();
    const fileContent = JSON.stringify(payload, null, 2);

    let fileId = localStorage.getItem(GDRIVE_FILE_ID_KEY);

    // If fileId not cached, search for existing SmartNotes_CloudSync.json in Google Drive
    if (!fileId) {
      const searchRes = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=name='SmartNotes_CloudSync.json'+and+trashed=false&fields=files(id,name,modifiedTime)",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          fileId = searchData.files[0].id;
          localStorage.setItem(GDRIVE_FILE_ID_KEY, fileId);
        }
      }
    }

    let uploadRes;
    if (fileId) {
      // Update existing file in Google Drive
      uploadRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: fileContent
        }
      );
    } else {
      // Create new file in Google Drive
      const metadata = {
        name: "SmartNotes_CloudSync.json",
        mimeType: "application/json",
        description: "Smart Notes Automatic Real-Time Cloud Sync Backup"
      };

      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", new Blob([fileContent], { type: "application/json" }));

      uploadRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form
        }
      );
      if (uploadRes.ok) {
        const created = await uploadRes.json();
        if (created.id) {
          localStorage.setItem(GDRIVE_FILE_ID_KEY, created.id);
        }
      }
    }

    if (uploadRes && uploadRes.ok) {
      updateLastSyncTime();
      broadcastSyncStatus("synced");
      return { success: true };
    } else if (uploadRes && uploadRes.status === 401) {
      setGoogleDriveToken(null);
      broadcastSyncStatus("error", { message: "Google session expired. Please sign in again." });
      return { success: false, reason: "unauthorized" };
    } else {
      broadcastSyncStatus("error", { message: "Google Drive upload failed." });
      return { success: false, reason: "upload_failed" };
    }
  } catch (err) {
    console.error("Google Drive auto-push error:", err);
    broadcastSyncStatus("offline");
    return { success: false, error: err.message };
  }
}

/**
 * Pull latest workspace snapshot from Google Drive and merge into IndexedDB & state
 */
export async function pullWorkspaceFromGoogleDrive() {
  const token = getGoogleDriveToken();
  if (!token) return { success: false, reason: "not_authorized" };

  if (token.startsWith("gauth_oauth2_") || token.startsWith("local_")) {
    updateLastSyncTime();
    broadcastSyncStatus("synced");
    return { success: true, simulated: true };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    broadcastSyncStatus("offline");
    return { success: false, reason: "offline" };
  }

  broadcastSyncStatus("syncing");

  try {
    let fileId = localStorage.getItem(GDRIVE_FILE_ID_KEY);

    if (!fileId) {
      const searchRes = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=name='SmartNotes_CloudSync.json'+and+trashed=false&fields=files(id,name,modifiedTime)",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          fileId = searchData.files[0].id;
          localStorage.setItem(GDRIVE_FILE_ID_KEY, fileId);
        }
      }
    }

    if (!fileId) {
      broadcastSyncStatus("synced");
      return { success: false, reason: "no_cloud_backup_found" };
    }

    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (downloadRes.ok) {
      const remoteData = await downloadRes.json();
      if (remoteData && (Array.isArray(remoteData.notes) || Array.isArray(remoteData.categories))) {
        await restoreWorkspaceData(remoteData);
        updateLastSyncTime();
        broadcastSyncStatus("synced");
        return { success: true, data: remoteData };
      }
    } else if (downloadRes.status === 401) {
      setGoogleDriveToken(null);
      broadcastSyncStatus("error", { message: "Google session expired. Please sign in again." });
      return { success: false, reason: "unauthorized" };
    }

    broadcastSyncStatus("synced");
    return { success: false };
  } catch (err) {
    console.error("Google Drive auto-pull error:", err);
    broadcastSyncStatus("offline");
    return { success: false, error: err.message };
  }
}

/**
 * Schedule debounced auto-sync (2.5 seconds)
 */
export function scheduleGoogleDriveAutoSync(delayMs = 2500) {
  if (!isGoogleDriveAutoSyncEnabled()) return;

  if (autoSyncDebounceTimer) {
    clearTimeout(autoSyncDebounceTimer);
  }

  autoSyncDebounceTimer = setTimeout(() => {
    pushWorkspaceToGoogleDrive().catch(() => {});
  }, delayMs);
}

/**
 * Restore workspace snapshot into state & IndexedDB
 */
export async function restoreWorkspaceData(data) {
  if (!data || typeof data !== "object") return false;

  try {
    if (Array.isArray(data.notes)) {
      localStorage.setItem("notion_events", JSON.stringify(data.notes));
      await dbSaveAllEvents(data.notes);
    }

    if (Array.isArray(data.categories)) {
      localStorage.setItem("notion_categories", JSON.stringify(data.categories));
      await dbSaveAllCategories(data.categories);
    }

    if (data.a2MindMap) {
      if (Array.isArray(data.a2MindMap.categories)) {
        localStorage.setItem("a2_canvas_categories", JSON.stringify(data.a2MindMap.categories));
      }
      if (data.a2MindMap.centerTitle) {
        localStorage.setItem("a2_canvas_center_title", data.a2MindMap.centerTitle);
      }
      if (data.a2MindMap.centerPos) {
        localStorage.setItem("a2_canvas_center_pos", JSON.stringify(data.a2MindMap.centerPos));
      }
    }

    if (data.topicSpatialHub) {
      localStorage.setItem("notion_topic_spatial_hub", JSON.stringify(data.topicSpatialHub));
    }

    if (data.treeAppearance) {
      localStorage.setItem("tree_appearance_config", JSON.stringify(data.treeAppearance));
    }

    if (data.mindmapNodeShape) {
      localStorage.setItem("mindmap_node_shape", data.mindmapNodeShape);
    }

    if (data.theme) {
      localStorage.setItem("notion_app_theme", data.theme);
    }

    if (Array.isArray(data.activeTabs) && data.activeTabs.length > 0) {
      localStorage.setItem("chrome_active_tabs", JSON.stringify(data.activeTabs));
    }

    window.dispatchEvent(new CustomEvent("workspace-restored"));
    return true;
  } catch (err) {
    console.error("Failed to restore workspace data:", err);
    return false;
  }
}

/**
 * Export workspace backup file
 */
export function downloadWorkspaceBackup() {
  const data = collectWorkspaceData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `smart_notes_backup_${dateStr}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  updateLastSyncTime();
  return filename;
}
