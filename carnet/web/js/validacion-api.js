import { CONFIG } from "./validacion-config.js?v=0022";
import { requestCarnetApi } from "./api-url.js?v=0022";

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
  return requestCarnetApi(buildValidateUrl(), signal, {
    apiUrl: CONFIG.API_URL,
    fallbackMessage: "No se pudo validar el carnet",
  });
}
