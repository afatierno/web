import { requestCarnetApi } from "../../../../carnet/web/js/api-url.js?v=0022";

function buildValidateDetailUrl(config) {
  const baseUrl = config.API_URL.trim();
  const encodedUuid = encodeURIComponent(config.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  let url = baseUrl + separator + "uuid=" + encodedUuid + "&fn=validateCarnetDetail";

  if (config.ISSUED_AT == null) {
    throw new Error("Falta el timestamp en el código QR");
  }

  url += "&timestamp=" + encodeURIComponent(String(config.ISSUED_AT));

  return url;
}

export async function fetchCarnetDetail(config, signal) {
  const data = await requestCarnetApi(buildValidateDetailUrl(config), signal, {
    apiUrl: config.API_URL,
    fallbackMessage: "No se pudo validar el carnet",
  });

  if (!Array.isArray(data.headers) || !Array.isArray(data.values)) {
    throw new Error("La respuesta no incluye los datos de la familia");
  }

  return data;
}
