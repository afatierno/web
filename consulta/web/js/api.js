import { CONFIG } from "./config.js";
import { requestCarnetApi } from "../../../carnet/web/js/api-url.js?v=0022";

export function buildSearchUrl(query) {
  const baseUrl = CONFIG.API_URL.trim();
  const uuid = encodeURIComponent(CONFIG.UUID);
  const q = encodeURIComponent(query.trim());
  const separator = baseUrl.includes("?") ? "&" : "?";

  return `${baseUrl}${separator}uuid=${uuid}&q=${q}&fn=generalSearch`;
}

export async function fetchSearch(query, signal) {
  return requestCarnetApi(buildSearchUrl(query), signal, {
    apiUrl: CONFIG.API_URL,
    fallbackMessage: "La búsqueda falló",
  });
}
