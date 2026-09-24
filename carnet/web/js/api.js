import { CONFIG } from "./config.js?v=0022";
import { requestCarnetApi } from "./api-url.js?v=0022";

function buildCarnetUrl() {
  const baseUrl = CONFIG.API_URL.trim();
  const encodedUuid = encodeURIComponent(CONFIG.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  return baseUrl + separator + "uuid=" + encodedUuid;
}

export async function fetchCarnet(signal) {
  return requestCarnetApi(buildCarnetUrl(), signal, {
    apiUrl: CONFIG.API_URL,
    fallbackMessage: "No se pudo cargar el carnet",
  });
}
