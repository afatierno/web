import { requestCarnetApi } from "../../../../carnet/web/js/api-url.js?v=0022";

function buildValidateUrl(config) {
  const baseUrl = config.API_URL.trim();
  const encodedUuid = encodeURIComponent(config.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  let url = baseUrl + separator + "uuid=" + encodedUuid + "&fn=validateCarnet";

  if (config.ISSUED_AT == null) {
    throw new Error("Falta el timestamp en el código QR");
  }

  url += "&timestamp=" + encodeURIComponent(String(config.ISSUED_AT));

  return url;
}

export async function fetchValidation(config, signal) {
  return requestCarnetApi(buildValidateUrl(config), signal, {
    apiUrl: config.API_URL,
    fallbackMessage: "No se pudo validar el carnet",
  });
}
