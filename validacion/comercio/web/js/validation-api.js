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
  const response = await fetch(buildValidateUrl(config), {
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
