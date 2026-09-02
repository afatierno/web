function buildValidateMerchantUrl(config) {
  const baseUrl = config.API_URL.trim();
  const encodedUuid = encodeURIComponent(config.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  return baseUrl + separator + "uuid=" + encodedUuid + "&fn=validateMerchant";
}

export async function fetchMerchantAccess(config, signal) {
  const response = await fetch(buildValidateMerchantUrl(config), {
    signal: signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Error HTTP " + response.status + ": " + response.statusText);
  }

  const data = await response.json();

  if (!data || typeof data !== "object") {
    throw new Error("La respuesta de acceso de comercio no es válida");
  }

  if (!data.ok) {
    throw new Error(data.error || "Acceso de comercio no autorizado");
  }

  if (!data.nombre) {
    throw new Error("La respuesta no incluye el nombre del comercio");
  }

  return data;
}
