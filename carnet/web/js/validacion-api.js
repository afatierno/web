import { CONFIG } from "./validacion-config.js?v=0013";

function buildValidateUrl() {
  const baseUrl = CONFIG.API_URL.trim();
  const encodedUuid = encodeURIComponent(CONFIG.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  let url = baseUrl + separator + "uuid=" + encodedUuid + "&fn=validateCarnet";

  if (CONFIG.ISSUED_AT == null) {
    throw new Error("Falta el timestamp en el enlace de validación");
  }

  url += "&timestamp=" + encodeURIComponent(String(CONFIG.ISSUED_AT));

  return url;
}

export async function fetchValidation(signal) {
  const response = await fetch(buildValidateUrl(), {
    signal: signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Error HTTP " + response.status + ": " + response.statusText);
  }

  const data = await response.json();

  if (!data || typeof data !== "object") {
    throw new Error("La respuesta de validación no es válida");
  }

  if (!data.ok) {
    throw new Error(data.error || "No se pudo validar el carnet");
  }

  return data;
}
