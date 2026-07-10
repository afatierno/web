const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONFIG_PARAM = "c";
const SESSION_KEY = "afa.carnet.access";

/** PDF certificado firmado (ruta fija en el sitio). */
export const CERTIFIED_PDF_URL = "assets/pdf/carnet-certificado.pdf";
export const CERTIFIED_PDF_FILENAME = "carnet-certificado.pdf";

export const CONTACT_EMAIL = "ampa.etierno@gmail.com";
export const OFFICIAL_SITE_URL = "https://afatierno.github.io/";

export const INFO_MESSAGES = [
  [
    { type: "text", value: "Este carnet pertenece a la unidad familiar y no es transferible." },
  ],
  [
    {
      type: "text",
      value:
        "Si has compartido el carnet con otra persona ajena o crees que alguien lo posee, escríbenos un correo a ",
    },
    { type: "link", href: "mailto:" + CONTACT_EMAIL, label: CONTACT_EMAIL },
    {
      type: "text",
      value: " para que podamos desactivar el viejo y generemos uno nuevo.",
    },
  ],
  [
    {
      type: "text",
      value: "Estos carnets solo son válidos si el dominio desde donde se ve es ",
    },
    { type: "link", href: OFFICIAL_SITE_URL, label: OFFICIAL_SITE_URL },
    {
      type: "text",
      value: " Cualquier otra dirección es una falsificación y, por lo tanto, no tiene validez.",
    },
  ],
];

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

function loadEncodedConfig() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get(CONFIG_PARAM);

  if (fromUrl) {
    sessionStorage.setItem(SESSION_KEY, fromUrl);
    stripConfigFromUrl();
    return fromUrl;
  }

  return sessionStorage.getItem(SESSION_KEY);
}

function parseEncodedConfig(encoded) {
  if (!encoded) {
    return { error: "Enlace de acceso no válido o sesión expirada" };
  }

  let decoded;

  try {
    decoded = decodeBase64(encoded);
  } catch {
    return { error: "El enlace de acceso no es válido" };
  }

  const separatorIndex = decoded.indexOf("|");

  if (separatorIndex === -1) {
    return { error: "El enlace de acceso tiene un formato inválido" };
  }

  const uuid = decoded.slice(0, separatorIndex).trim();
  const apiUrl = decoded.slice(separatorIndex + 1).trim();

  if (!uuid) {
    return { error: "Falta el token en el enlace de acceso" };
  }

  if (!UUID_V4_REGEX.test(uuid)) {
    return { error: "El token no es un UUID v4 válido" };
  }

  if (!apiUrl) {
    return { error: "Falta la URL del script en el enlace de acceso" };
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

const parsed = parseEncodedConfig(loadEncodedConfig());

export const CONFIG_ERROR = parsed.error || null;
export const CONFIG = parsed.config || null;

export function encodeAccessConfig(uuid, apiUrl) {
  return btoa(uuid + "|" + apiUrl);
}

export function clearAccessSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
