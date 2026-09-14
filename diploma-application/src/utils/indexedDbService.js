/**
 * indexedDbService.js
 * High-Capacity, Unlimited Local Storage Engine for Smart Notes
 * Supports Gigabytes/Terabytes of notes, drawings, attachments, and categories.
 */

const DB_NAME = "SmartNotesDB";
const DB_VERSION = 1;

const STORES = {
  EVENTS: "events",
  CATEGORIES: "categories",
  META: "meta",
  ATTACHMENTS: "attachments"
};

let dbInstance = null;

/**
 * Open or initialize IndexedDB instance
 */
export function openIndexedDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      console.warn("IndexedDB not supported in this environment.");
      return resolve(null);
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.EVENTS)) {
        db.createObjectStore(STORES.EVENTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.ATTACHMENTS)) {
        db.createObjectStore(STORES.ATTACHMENTS, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error("IndexedDB open error:", event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Save all events into IndexedDB
 */
export async function dbSaveAllEvents(events = []) {
  try {
    const db = await openIndexedDB();
    if (!db) return false;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EVENTS, "readwrite");
      const store = tx.objectStore(STORES.EVENTS);

      store.clear(); // Clear existing to maintain clean sync
      events.forEach((evt) => {
        if (evt && evt.id) {
          store.put(evt);
        }
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => {
        console.error("Failed to save events to IndexedDB:", e);
        reject(e);
      };
    });
  } catch (err) {
    console.error("dbSaveAllEvents error:", err);
    return false;
  }
}

/**
 * Retrieve all events from IndexedDB
 */
export async function dbGetAllEvents() {
  try {
    const db = await openIndexedDB();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EVENTS, "readonly");
      const store = tx.objectStore(STORES.EVENTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error("dbGetAllEvents error:", err);
    return null;
  }
}

/**
 * Save categories into IndexedDB
 */
export async function dbSaveAllCategories(categories = []) {
  try {
    const db = await openIndexedDB();
    if (!db) return false;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readwrite");
      const store = tx.objectStore(STORES.CATEGORIES);

      store.clear();
      categories.forEach((cat) => {
        if (cat && cat.id) {
          store.put(cat);
        }
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error("dbSaveAllCategories error:", err);
    return false;
  }
}

/**
 * Retrieve all categories from IndexedDB
 */
export async function dbGetAllCategories() {
  try {
    const db = await openIndexedDB();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readonly");
      const store = tx.objectStore(STORES.CATEGORIES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error("dbGetAllCategories error:", err);
    return null;
  }
}

/**
 * Set a key-value meta setting in IndexedDB
 */
export async function dbSetMeta(key, value) {
  try {
    const db = await openIndexedDB();
    if (!db) return false;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.META, "readwrite");
      const store = tx.objectStore(STORES.META);
      store.put({ key, value, updated: Date.now() });

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error("dbSetMeta error:", err);
    return false;
  }
}

/**
 * Get a key-value meta setting from IndexedDB
 */
export async function dbGetMeta(key) {
  try {
    const db = await openIndexedDB();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.META, "readonly");
      const store = tx.objectStore(STORES.META);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error("dbGetMeta error:", err);
    return null;
  }
}

/**
 * Automatically migrate existing localStorage data to IndexedDB on first run
 */
export async function migrateLocalStorageToIndexedDB() {
  try {
    const isMigrated = await dbGetMeta("migrated_from_localstorage_v1");
    if (isMigrated) return;

    let localEvents = [];
    let localCategories = [];

    try {
      const rawEvents = localStorage.getItem("notion_events");
      if (rawEvents) localEvents = JSON.parse(rawEvents);
    } catch {}

    try {
      const rawCats = localStorage.getItem("notion_categories");
      if (rawCats) localCategories = JSON.parse(rawCats);
    } catch {}

    if (localEvents.length > 0) {
      await dbSaveAllEvents(localEvents);
    }
    if (localCategories.length > 0) {
      await dbSaveAllCategories(localCategories);
    }

    await dbSetMeta("migrated_from_localstorage_v1", true);
    console.log("Successfully migrated local data to high-capacity IndexedDB.");
  } catch (err) {
    console.warn("Migration to IndexedDB notice:", err);
  }
}

/**
 * Format bytes to readable string (e.g. "14.2 MB", "230.5 GB")
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Get accurate live disk quota estimate from browser
 */
export async function getStorageQuotaEstimate() {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const total = estimate.quota || 0;
      const percent = total > 0 ? ((used / total) * 100).toFixed(2) : "0";

      return {
        usedBytes: used,
        totalBytes: total,
        usedFormatted: formatBytes(used),
        totalFormatted: formatBytes(total),
        percentUsed: percent,
        isSupported: true
      };
    } catch (err) {
      console.warn("Storage estimate error:", err);
    }
  }

  return {
    usedBytes: 0,
    totalBytes: 0,
    usedFormatted: "Local Device Space",
    totalFormatted: "Unlimited (SSD/HDD)",
    percentUsed: "0",
    isSupported: false
  };
}
