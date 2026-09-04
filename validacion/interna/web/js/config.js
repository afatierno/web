const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONFIG_PARAM = "c";
const SESSION_KEY = "afa.interna.access";

/** Exige enlace ?c= validado contra el web app de Token (hoja tokens). */
export const REQUIRE_INTERNAL_ACCESS = true;

export const OFFICIAL_DOMAIN = "afatierno.github.io";
export const OFFICIAL_VALIDATION_PATH = "/web/carnet/web/validacion.html";

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

  const parsedFromUrl = parseInternalAccessConfig(fromUrl);

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

export function parseInternalAccessConfig(encoded) {
  if (!encoded) {
    return { error: "Enlace de acceso interno no válido o sesión expirada" };
  }

  let decoded;

  try {
    decoded = decodeBase64(encoded);
  } catch {
    return { error: "El enlace de acceso interno no es válido" };
  }

  const separatorIndex = decoded.indexOf("|");

  if (separatorIndex === -1) {
    return { error: "El enlace de acceso interno tiene un formato inválido" };
  }

  const uuid = decoded.slice(0, separatorIndex).trim();
  const apiUrl = decoded.slice(separatorIndex + 1).trim();

  if (!uuid) {
    return { error: "Falta el token de acceso en el enlace" };
  }

  if (!UUID_V4_REGEX.test(uuid)) {
    return { error: "El token de acceso no es un UUID v4 válido" };
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
    },
  };
}

const parsed = CONFIG_PENDING_REDIRECT
  ? { config: null, error: null }
  : bootstrapConfigError_
    ? { error: bootstrapConfigError_ }
    : parseInternalAccessConfig(loadEncodedConfig());

let configError = parsed.error || null;
let config = parsed.config || null;

if (!REQUIRE_INTERNAL_ACCESS) {
  configError = null;
}

export { CONFIG_PENDING_REDIRECT };
export const CONFIG_ERROR = configError;
export const CONFIG = config;

export function clearAccessSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
