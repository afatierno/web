function buildValidateInternalUrl(config, callbackName) {
  const baseUrl = config.API_URL.trim();
  const encodedUuid = encodeURIComponent(config.UUID);
  const separator = baseUrl.includes("?") ? "&" : "?";

  let url = baseUrl + separator + "uuid=" + encodedUuid + "&fn=validateInternal";

  if (callbackName) {
    url += "&callback=" + encodeURIComponent(callbackName);
  }

  return url;
}

function fetchJsonp_(url, callbackName, signal, timeoutMessage) {
  return new Promise(function (resolve, reject) {
    let settled = false;
    const script = document.createElement("script");
    const timeout = setTimeout(function () {
      finish(new Error(timeoutMessage));
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
      finish(new Error("No se pudo contactar con el servidor de acceso"));
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

export async function fetchInternalAccess(config, signal) {
  const callbackName =
    "afaInternaCb_" + String(Date.now()) + "_" + Math.random().toString(36).slice(2);
  const url = buildValidateInternalUrl(config, callbackName);
  const data = await fetchJsonp_(
    url,
    callbackName,
    signal,
    "Tiempo de espera agotado al comprobar el acceso"
  );

  if (!data || typeof data !== "object") {
    throw new Error("La respuesta de acceso interno no es válida");
  }

  if (!data.ok) {
    throw new Error(data.error || "Acceso interno no autorizado");
  }

  if (!data.propietario) {
    throw new Error("La respuesta no incluye el usuario autorizado");
  }

  return data;
}
