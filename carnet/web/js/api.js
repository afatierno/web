import { CONFIG } from "./config.js?v=0006";

function buildCarnetUrl() {
  const baseUrl = CONFIG.API_URL.trim();
  const encodedUuid = encodeURIComponent(CONFIG.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  return baseUrl + separator + "uuid=" + encodedUuid;
}

export async function fetchCarnet(signal) {
  const response = await fetch(buildCarnetUrl(), {
    signal: signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Error HTTP " + response.status + ": " + response.statusText);
  }

  const data = await response.json();

  if (!data || typeof data !== "object") {
    throw new Error("La respuesta del carnet no es válida");
  }

  if (!data.ok) {
    throw new Error(data.error || "No se pudo cargar el carnet");
  }

  return data;
}
