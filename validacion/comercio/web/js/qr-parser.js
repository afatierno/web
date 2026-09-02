const moduleParams_ = new URL(import.meta.url).searchParams;
const moduleQuery_ =
  "v=" +
  encodeURIComponent(moduleParams_.get("v") || "") +
  "&b=" +
  encodeURIComponent(moduleParams_.get("b") || String(Date.now()));

const { OFFICIAL_DOMAIN, OFFICIAL_VALIDATION_PATH } = await import("./config.js?" + moduleQuery_);

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeBase64(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return atob(normalized + padding);
}

function normalizePathname(pathname) {
  if (!pathname) {
    return "/";
  }

  const withLeadingSlash = pathname.startsWith("/") ? pathname : "/" + pathname;

  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
}

function extractEncodedConfig(rawInput) {
  const trimmed = String(rawInput || "").trim();

  if (!trimmed) {
    return { error: "No se ha recibido ningún código QR" };
  }

  if (trimmed.includes("://")) {
    let parsedUrl;

    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return { error: "El QR no contiene una URL válida" };
    }

    if (parsedUrl.hostname.toLowerCase() !== OFFICIAL_DOMAIN) {
      return {
        error:
          "El QR no pertenece al dominio oficial (" +
          OFFICIAL_DOMAIN +
          "). No lo valides.",
      };
    }

    const pathname = normalizePathname(parsedUrl.pathname);

    if (pathname !== OFFICIAL_VALIDATION_PATH) {
      return {
        error: "El QR no apunta a la página oficial de validación del carnet",
      };
    }

    const encoded = parsedUrl.searchParams.get("c");

    if (!encoded) {
      return { error: "El QR no incluye el código de validación" };
    }

    return { encoded: encoded };
  }

  return { encoded: trimmed };
}

export function parseValidationQrPayload(rawInput) {
  const extracted = extractEncodedConfig(rawInput);

  if (extracted.error) {
    return { error: extracted.error };
  }

  let decoded;

  try {
    decoded = decodeBase64(extracted.encoded);
  } catch {
    return { error: "El código QR de validación no es válido" };
  }

  const parts = decoded.split("|");

  if (parts.length < 3) {
    return { error: "El código QR tiene un formato inválido (falta timestamp)" };
  }

  const uuid = parts[0].trim();
  const timestampPart = parts[1].trim();
  const apiUrl = parts.slice(2).join("|").trim();

  if (!/^\d+$/.test(timestampPart)) {
    return { error: "El código QR tiene un timestamp inválido" };
  }

  const issuedAt = Number(timestampPart);

  if (!uuid) {
    return { error: "Falta el token de validación en el QR" };
  }

  if (!UUID_V4_REGEX.test(uuid)) {
    return { error: "El token de validación del QR no es válido" };
  }

  if (!apiUrl) {
    return { error: "Falta la URL del script en el QR" };
  }

  try {
    new URL(apiUrl);
  } catch {
    return { error: "La URL del script del QR no es válida" };
  }

  return {
    config: {
      UUID: uuid,
      API_URL: apiUrl,
      ISSUED_AT: issuedAt,
    },
  };
}
