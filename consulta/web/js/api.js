import { CONFIG } from "./config.js";

export function buildSearchUrl(query) {
  const baseUrl = CONFIG.API_URL.trim();
  const uuid = encodeURIComponent(CONFIG.UUID);
  const q = encodeURIComponent(query.trim());
  const separator = baseUrl.includes("?") ? "&" : "?";

  return `${baseUrl}${separator}uuid=${uuid}&q=${q}&fn=generalSearch`;
}

export async function fetchSearch(query, signal) {
  const response = await fetch(buildSearchUrl(query), { signal });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "La búsqueda falló");
  }

  return data;
}
