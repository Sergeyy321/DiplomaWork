const API_BASE = process.env.REACT_APP_API_URL || "";

async function request(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Server error (${response.status})`);
  }

  return data;
}

export async function analyzeNote({ title, content, mode = "full" }) {
  return request("/api/analyze", { title, content, mode });
}

export async function chatAboutNote({ title, content, message, history }) {
  return request("/api/chat", { title, content, message, history });
}

export async function checkAiHealth() {
  const response = await fetch(`${API_BASE}/api/health`);
  return response.json();
}

export async function importPdf({ file, folders, subcategoriesByTopic }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "context",
    JSON.stringify({ folders, subcategoriesByTopic })
  );

  const response = await fetch(`${API_BASE}/api/import-pdf`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Import failed (${response.status})`);
  }
  return data;
}
