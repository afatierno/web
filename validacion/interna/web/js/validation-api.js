import { requestCarnetApi } from "../../../../carnet/web/js/api-url.js?v=0022";

function buildValidateDetailUrl(qrConfig, accessConfig) {
  const baseUrl = qrConfig.API_URL.trim();
  const encodedUuid = encodeURIComponent(qrConfig.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  let url = baseUrl + separator + "uuid=" + encodedUuid + "&fn=validateCarnetDetail";

  if (qrConfig.ISSUED_AT == null) {
    throw new Error("Falta el timestamp en el código QR");
  }

  url += "&timestamp=" + encodeURIComponent(String(qrConfig.ISSUED_AT));

  if (!accessConfig || !accessConfig.UUID) {
    throw new Error("Falta el token de acceso interno");
  }

  url += "&accessUuid=" + encodeURIComponent(accessConfig.UUID);

  return url;
}

export async function fetchCarnetDetail(qrConfig, accessConfig, signal) {
  const data = await requestCarnetApi(buildValidateDetailUrl(qrConfig, accessConfig), signal, {
    apiUrl: qrConfig.API_URL,
    fallbackMessage: "No se pudo validar el carnet",
  });

  if (!Array.isArray(data.headers) || !Array.isArray(data.values)) {
    throw new Error("La respuesta no incluye los datos de la familia");
  }

  return data;
}
