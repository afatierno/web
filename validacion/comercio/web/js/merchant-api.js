function buildValidateMerchantUrl(config, callbackName) {
  const baseUrl = config.API_URL.trim();
  const encodedUuid = encodeURIComponent(config.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  let url = baseUrl + separator + "uuid=" + encodedUuid + "&fn=validateMerchant";

  if (callbackName) {
    url += "&callback=" + encodeURIComponent(callbackName);
  }

  return url;
}

function fetchJsonp_(url, callbackName, signal) {
  return new Promise(function (resolve, reject) {
    let settled = false;
    const script = document.createElement("script");
    const timeout = setTimeout(function () {
      finish(new Error("Tiempo de espera agotado al comprobar el comercio"));
    }, 20000);

    function finish(error, data) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();

      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }

      if (error) {
        reject(error);
        return;
      }

      resolve(data);
    }

    function onAbort() {
      finish(new DOMException("Aborted", "AbortError"));
    }

    window[callbackName] = function (data) {
      finish(null, data);
    };

    script.onerror = function () {
      finish(new Error("No se pudo contactar con el servidor de comercio"));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }

      signal.addEventListener("abort", onAbort);
    }

    script.src = url;
    document.head.appendChild(script);
  });
}

export async function fetchMerchantAccess(config, signal) {
  const callbackName =
    "afaMerchantCb_" + String(Date.now()) + "_" + Math.random().toString(36).slice(2);
  const url = buildValidateMerchantUrl(config, callbackName);
  const data = await fetchJsonp_(url, callbackName, signal);

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
