import { CONFIG } from "./config.js";

export function buildSearchUrl(query, useCache, options) {
  const baseUrl = CONFIG.API_URL.trim();
  const uuid = encodeURIComponent(CONFIG.UUID);
  const q = encodeURIComponent(query.trim());
  const separator = baseUrl.includes("?") ? "&" : "?";
  const cacheFlag = useCache ? "1" : "0";
  const opts = options || {};
  const useTokenCache = opts.useTokenCache !== false;
  const tokenCacheFlag = useTokenCache ? "1" : "0";

  let url =
    `${baseUrl}${separator}uuid=${uuid}&q=${q}&fn=generalSearch` +
    `&useCache=${cacheFlag}&useTokenCache=${tokenCacheFlag}`;

  if (opts.diag) {
    url += "&diag=1";
  }

  return url;
}

export async function fetchSearch(query, signal, useCache, options) {
  const response = await fetch(buildSearchUrl(query, useCache, options), { signal });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "La búsqueda falló");
  }

  return data;
}
