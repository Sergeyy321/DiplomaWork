const STORAGE_KEY = "topicSpatialHub.v1";
const TOPIC_COLORS = ["#4f46e5", "#0d9488", "#d97706", "#7c3aed", "#2563eb", "#db2777"];

const loadStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStorage = (partial) => {
  try {
    const current = loadStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
    window.dispatchEvent(new CustomEvent("topic-storage-changed"));
  } catch {
    // ignore quota errors
  }
};

const loadSubcategoriesByTopic = () => loadStorage().subcategoriesByTopic || {};

const saveSubcategoriesByTopic = (subcategoriesByTopic) => {
  saveStorage({ subcategoriesByTopic });
};

const addSubcategory = (topicId, title) => {
  const subcategoriesByTopic = loadSubcategoriesByTopic();
  const existing = subcategoriesByTopic[topicId] || [];
  const nextSubcategory = {
    id: `sub_${Date.now()}`,
    title: title.trim(),
    color: TOPIC_COLORS[existing.length % TOPIC_COLORS.length],
  };
  const updated = {
    ...subcategoriesByTopic,
    [topicId]: [...existing, nextSubcategory],
  };
  saveSubcategoriesByTopic(updated);
  return nextSubcategory;
};

export {
  STORAGE_KEY,
  TOPIC_COLORS,
  loadStorage,
  saveStorage,
  loadSubcategoriesByTopic,
  saveSubcategoriesByTopic,
  addSubcategory,
};
