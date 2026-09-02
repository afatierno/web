export function getMediaDevices() {
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
    return navigator.mediaDevices;
  }

  const legacyGetUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

  if (typeof legacyGetUserMedia !== "function") {
    return null;
  }

  return {
    getUserMedia: function (constraints) {
      return new Promise(function (resolve, reject) {
        legacyGetUserMedia.call(navigator, constraints, resolve, reject);
      });
    },
  };
}

export function isScannerSupported() {
  return window.isSecureContext && !!getMediaDevices();
}

function isProbablyMobile_() {
  return /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
}

function tryGetUserMedia_(media, attempts) {
  let chain = Promise.reject(new Error("No hay intentos de cámara"));

  attempts.forEach(function (constraints) {
    chain = chain.catch(function () {
      return media.getUserMedia(constraints);
    });
  });

  return chain;
}

export function requestCameraStreamFromGesture() {
  const media = getMediaDevices();

  if (!media) {
    return Promise.reject(new Error("Este navegador no expone la API de cámara"));
  }

  if (isProbablyMobile_()) {
    return tryGetUserMedia_(media, [
      { audio: false, video: { facingMode: { ideal: "environment" } } },
      { audio: false, video: { facingMode: "user" } },
      { audio: false, video: true },
    ]);
  }

  return tryGetUserMedia_(media, [
    { audio: false, video: { facingMode: "user" } },
    { audio: false, video: true },
  ]);
}

export function formatCameraError(error) {
  if (!error) {
    return "No se pudo acceder a la cámara";
  }

  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return (
      "Permiso de cámara denegado (" +
      error.name +
      "). En Chrome/Brave: ⋮ o candado en la barra → Cámara → Permitir, y recarga."
    );
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No se detectó ninguna cámara en este dispositivo (" + error.name + ").";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "La cámara está en uso por otra app (" + error.name + ").";
  }

  if (error.name === "SecurityError") {
    return "El navegador bloqueó la cámara por seguridad (" + error.name + ").";
  }

  return (error.message || "No se pudo acceder a la cámara") + " (" + (error.name || "Error") + ")";
}

function getHtml5Qrcode_() {
  if (typeof window.Html5Qrcode !== "function") {
    throw new Error("No se cargó el lector QR. Recarga la página.");
  }

  return window.Html5Qrcode;
}

function stopStream_(mediaStream) {
  if (!mediaStream) {
    return;
  }

  mediaStream.getTracks().forEach(function (track) {
    track.stop();
  });
}

export function createQrScanner(options) {
  options = options || {};

  const video = options.videoElement;
  const libraryHost = options.libraryHostElement;
  const onScan = typeof options.onScan === "function" ? options.onScan : function () {};
  const onStatus = typeof options.onStatus === "function" ? options.onStatus : function () {};
  const onError = typeof options.onError === "function" ? options.onError : function () {};

  let html5QrCode = null;
  let active = false;

  async function startLibrary_(deviceId) {
    if (video) {
      video.hidden = true;
    }

    if (libraryHost) {
      libraryHost.hidden = false;
    }

    const Html5Qrcode = getHtml5Qrcode_();

    html5QrCode = new Html5Qrcode(libraryHost.id);
    active = true;

    const scanConfig = {
      fps: 10,
      qrbox: function (viewfinderWidth, viewfinderHeight) {
        const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
        return { width: edge, height: edge };
      },
    };

    const cameraConfigs = deviceId
      ? [{ deviceId: { exact: deviceId } }, { facingMode: "user" }]
      : isProbablyMobile_()
        ? [{ facingMode: { ideal: "environment" } }, { facingMode: "user" }]
        : [{ facingMode: "user" }];

    let lastError = null;

    for (let i = 0; i < cameraConfigs.length; i++) {
      try {
        await html5QrCode.start(cameraConfigs[i], scanConfig, onDecoded_, noopFrame_);
        onStatus("Apunta al código QR del carnet");
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No se pudo iniciar el lector QR");
  }

  function onDecoded_(decodedText) {
    const value = String(decodedText || "").trim();

    if (!value || !active) {
      return;
    }

    onStatus("Código detectado. Comprobando…");
    stop().then(function () {
      onScan(value);
    });
  }

  function noopFrame_() {}

  async function startWithStream(mediaStream) {
    await stop();

    if (!mediaStream) {
      throw new Error("No se recibió la cámara");
    }

    const track = mediaStream.getVideoTracks()[0];
    const deviceId = track && track.getSettings ? track.getSettings().deviceId : "";

    stopStream_(mediaStream);
    await startLibrary_(deviceId);
  }

  async function stopLibrary_() {
    if (!html5QrCode) {
      return;
    }

    const instance = html5QrCode;
    html5QrCode = null;

    try {
      if (instance.isScanning) {
        await instance.stop();
      }

      instance.clear();
    } catch (error) {
      onError(error);
    }

    if (libraryHost) {
      libraryHost.replaceChildren();
      libraryHost.hidden = true;
    }
  }

  async function stop() {
    active = false;
    await stopLibrary_();
  }

  return {
    startWithStream: startWithStream,
    stop: stop,
    isActive: function () {
      return active;
    },
  };
}
