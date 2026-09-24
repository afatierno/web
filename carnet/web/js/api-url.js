const URL_SHORTENER_HOSTS = new Set([
  "tinyurl.com",
  "www.tinyurl.com",
  "bit.ly",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
]);

/**
 * @returns {string|null} Mensaje de error o null si la URL es usable.
 */
export function validateCarnetApiUrl(apiUrl) {
  let parsed;

  try {
    parsed = new URL(String(apiUrl || "").trim());
  } catch {
    return "La URL del script no es válida";
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "La URL del script debe ser http(s)";
  }

  return null;
}

export function isUrlShortenerApiHost(apiUrl) {
  try {
    return URL_SHORTENER_HOSTS.has(new URL(String(apiUrl || "").trim()).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function shouldTryCarnetJsonpFallback(error) {
  if (error && error.name === "AbortError") {
    return false;
  }

  if (error instanceof TypeError) {
    return true;
  }

  const message = error && error.message ? String(error.message) : "";

  return message === "Failed to fetch";
}

export function fetchCarnetApiJsonp(url, signal) {
  return new Promise(function (resolve, reject) {
    if (signal && signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const callbackName =
      "carnetCb_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";

    script.src = url + separator + "callback=" + encodeURIComponent(callbackName);
    script.async = true;

    function cleanup() {
      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }

    function onAbort() {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    }

    window[callbackName] = function (data) {
      cleanup();
      resolve(data);
    };

    script.onerror = function () {
      cleanup();
      reject(
        new Error(
          "No se pudo contactar con el script del carnet (JSONP). " +
            "Comprueba que el Web App admite callback y, en enlaces nuevos, usa la URL /exec directa."
        )
      );
    };

    if (signal) {
      signal.addEventListener("abort", onAbort);
    }

    document.head.appendChild(script);
  });
}

export function assertCarnetApiPayload(data, fallbackMessage) {
  if (!data || typeof data !== "object") {
    throw new Error("La respuesta del carnet no es válida");
  }

  if (!data.ok) {
    throw new Error(data.error || fallbackMessage || "No se pudo completar la petición");
  }

  return data;
}

export function formatCarnetFetchError(error) {
  if (error && error.name === "AbortError") {
    return null;
  }

  const message = error && error.message ? String(error.message) : "";

  if (message === "Failed to fetch" || error instanceof TypeError) {
    return null;
  }

  return message || "No se pudo cargar el carnet";
}

async function fetchCarnetApiViaFetch(url, signal) {
  const response = await fetch(url, {
    signal: signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Error HTTP " + response.status + ": " + response.statusText);
  }

  return response.json();
}

/**
 * @param {string} requestUrl URL completa con uuid, fn, etc.
 * @param {AbortSignal} signal
 * @param {{ apiUrl?: string, fallbackMessage?: string }} [options] apiUrl = base del Web App (para detectar acortadores)
 */
export async function requestCarnetApi(requestUrl, signal, options) {
  const apiUrl = (options && options.apiUrl) || requestUrl;
  const fallbackMessage =
    (options && options.fallbackMessage) || "No se pudo completar la petición";

  if (isUrlShortenerApiHost(apiUrl)) {
    const data = await fetchCarnetApiJsonp(requestUrl, signal);
    return assertCarnetApiPayload(data, fallbackMessage);
  }

  try {
    const data = await fetchCarnetApiViaFetch(requestUrl, signal);
    return assertCarnetApiPayload(data, fallbackMessage);
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw error;
    }

    if (shouldTryCarnetJsonpFallback(error)) {
      const data = await fetchCarnetApiJsonp(requestUrl, signal);
      return assertCarnetApiPayload(data, fallbackMessage);
    }

    const message = formatCarnetFetchError(error);

    if (message) {
      throw new Error(message);
    }

    throw error;
  }
}
