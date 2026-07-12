import { CONFIG } from "./config.js?v=0003";

function buildCarnetUrl() {
  const baseUrl = CONFIG.API_URL.trim();
  const encodedUuid = encodeURIComponent(CONFIG.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  return baseUrl + separator + "uuid=" + encodedUuid;
}

function fetchCarnetJsonp(url, signal) {
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
      reject(new Error("No se pudo contactar con el script del carnet"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort);
    }

    document.head.appendChild(script);
  });
}

export async function fetchCarnet(signal) {
  const data = await fetchCarnetJsonp(buildCarnetUrl(), signal);

  if (!data || typeof data !== "object") {
    throw new Error("La respuesta del carnet no es válida");
  }

  if (!data.ok) {
    throw new Error(data.error || "No se pudo cargar el carnet");
  }

  return data;
}
