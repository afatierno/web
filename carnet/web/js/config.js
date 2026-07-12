const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONFIG_PARAM = "c";
const SESSION_KEY = "afa.carnet.access";

/** Si hay ?c= en la URL, guardamos y recargamos sin ese parámetro (fuerza JS nuevo). */
let bootstrapConfigError_ = null;
const CONFIG_PENDING_REDIRECT = bootstrapAccessConfig_();

/** PDF certificado firmado (ruta fija en el sitio). */
export const CERTIFIED_PDF_URL = "assets/pdf/carnet-certificado.pdf";
export const CERTIFIED_PDF_FILENAME = "carnet-certificado.pdf";

export const CONTACT_EMAIL = "ampa.etierno@gmail.com";
export const OFFICIAL_SITE_URL = "https://afatierno.github.io/web/";
export const OFFICIAL_DOMAIN_URL = "https://afatierno.github.io/";
export const VALIDATION_PAGE_URL = "https://afatierno.github.io/web/carnet/web/validacion.html";

export const CARNET_VALIDITY_TEXT = "Periodo de Validez: septiembre de 2026 a agosto de 2027";

export const INFO_MESSAGES = [
  [
    {
      type: "text",
      value: "Este carné pertenece a la unidad familiar y no es transferible.",
    },
  ],
  [
    {
      type: "text",
      value:
        "El acceso se realiza exclusivamente mediante un enlace personal. No compartas ese enlace ni el carné fuera de tu familia: quien lo tenga podrá identificarse como parte de ella.",
    },
  ],
  [
    {
      type: "text",
      value:
        "Si has compartido el enlace por error, lo has perdido o crees que alguien ajeno lo posee, escríbenos a ",
    },
    { type: "link", href: "mailto:" + CONTACT_EMAIL, label: CONTACT_EMAIL },
    {
      type: "text",
      value: " para desactivarlo y generar uno nuevo.",
    },
  ],
  [
    {
      type: "text",
      value: "Este carné solo es válido si se visualiza desde ",
    },
    { type: "link", href: OFFICIAL_DOMAIN_URL, label: OFFICIAL_DOMAIN_URL },
    {
      type: "text",
      value: " Cualquier otra dirección es una falsificación sin validez.",
    },
  ],
  [
    {
      type: "text",
      value:
        "El AFA no se hace responsable del uso indebido del carné si no se ha notificado su pérdida o cesión no autorizada.",
    },
  ],
  [
    {
      type: "text",
      value:
        "Los datos personales mostrados en este carné son tratados por el AFA Enrique Tierno Galván de Getafe para identificar a los socios. Puedes ejercer tus derechos de acceso, rectificación o supresión escribiendo a ",
    },
    { type: "link", href: "mailto:" + CONTACT_EMAIL, label: CONTACT_EMAIL },
    { type: "text", value: "." },
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

const parsed = CONFIG_PENDING_REDIRECT
  ? { config: null, error: null }
  : bootstrapConfigError_
    ? { error: bootstrapConfigError_ }
    : parseEncodedConfig(loadEncodedConfig());

export { CONFIG_PENDING_REDIRECT };
export const CONFIG_ERROR = parsed.error || null;
export const CONFIG = parsed.config || null;

export function encodeAccessConfig(uuid, apiUrl) {
  return btoa(uuid + "|" + apiUrl);
}

export function clearAccessSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
