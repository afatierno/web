const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONFIG_PARAM = "c";
const SESSION_KEY = "afa.carnet.validacion.access";

export const CERTIFIED_PDF_URL = "assets/pdf/carnet-certificado.pdf";
export const CERTIFIED_PDF_FILENAME = "carnet-certificado.pdf";

/** Visible en la página de validación; súbelo al desplegar cambios. */
export const APP_VERSION = "v0003";

let bootstrapConfigError_ = null;
const CONFIG_PENDING_REDIRECT = bootstrapAccessConfig_();

function decodeBase64(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return atob(normalized + padding);
}

function stripConfigFromUrl() {
  if (!window.location.search.includes(CONFIG_PARAM + "=")) {
    return;
  }

  const cleanUrl = window.location.pathname + window.location.hash;
  history.replaceState(null, document.title, cleanUrl);
}

function bootstrapAccessConfig_() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get(CONFIG_PARAM);

  if (!fromUrl) {
    return false;
  }

  const parsedFromUrl = parseEncodedConfig(fromUrl);

  if (parsedFromUrl.error) {
    sessionStorage.removeItem(SESSION_KEY);
    bootstrapConfigError_ = parsedFromUrl.error;
    stripConfigFromUrl();
    return false;
  }

  sessionStorage.setItem(SESSION_KEY, fromUrl);

  if (window.location.search) {
    const cleanUrl = window.location.pathname + window.location.hash;
    window.location.replace(cleanUrl);
    return true;
  }

  return false;
}

function loadEncodedConfig() {
  return sessionStorage.getItem(SESSION_KEY);
}

function parseEncodedConfig(encoded) {
  if (!encoded) {
    return { error: "Enlace de validación no válido o sesión expirada" };
  }

  let decoded;

  try {
    decoded = decodeBase64(encoded);
  } catch {
    return { error: "El enlace de validación no es válido" };
  }

  const parts = decoded.split("|");

  if (parts.length < 2) {
    return { error: "El enlace de validación tiene un formato inválido" };
  }

  const uuid = parts[0].trim();
  let issuedAt = null;
  let apiUrl;

  if (parts.length === 2) {
    apiUrl = parts[1].trim();
  } else {
    const timestampPart = parts[1].trim();
    apiUrl = parts.slice(2).join("|").trim();

    if (!/^\d+$/.test(timestampPart)) {
      return { error: "El enlace de validación tiene un timestamp inválido" };
    }

    issuedAt = Number(timestampPart);
  }

  if (!uuid) {
    return { error: "Falta el token de validación en el enlace" };
  }

  if (!UUID_V4_REGEX.test(uuid)) {
    return { error: "El token de validación no es un UUID v4 válido" };
  }

  if (!apiUrl) {
    return { error: "Falta la URL del script en el enlace" };
  }

  try {
    new URL(apiUrl);
  } catch {
    return { error: "La URL del script no es válida" };
  }

  return {
    config: {
      UUID: uuid,
      API_URL: apiUrl,
      ISSUED_AT: issuedAt,
    },
  };
}

const parsed = CONFIG_PENDING_REDIRECT
  ? { config: null, error: null }
  : bootstrapConfigError_
    ? { error: bootstrapConfigError_ }
    : parseEncodedConfig(loadEncodedConfig());

export { CONFIG_PENDING_REDIRECT };
export const CONFIG_ERROR = parsed.error || null;
export const CONFIG = parsed.config || null;
