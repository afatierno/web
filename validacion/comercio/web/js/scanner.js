const SCAN_INTERVAL_MS = 180;

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

export function requestCameraStreamFromGesture() {
  const media = getMediaDevices();

  if (!media) {
    return Promise.reject(new Error("Este navegador no expone la API de cámara"));
  }

  return media
    .getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
      },
    })
    .catch(function () {
      return media.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
        },
      });
    })
    .catch(function () {
      return media.getUserMedia({
        audio: false,
        video: true,
      });
    });
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

function canUseNativeBarcode_() {
  return typeof window.BarcodeDetector === "function";
}

function getHtml5Qrcode_() {
  if (typeof window.Html5Qrcode !== "function") {
    throw new Error("No se cargó el lector QR. Recarga la página.");
  }

  return window.Html5Qrcode;
}

export function createQrScanner(options) {
  options = options || {};

  const video = options.videoElement;
  const libraryHost = options.libraryHostElement;
  const onScan = typeof options.onScan === "function" ? options.onScan : function () {};
  const onStatus = typeof options.onStatus === "function" ? options.onStatus : function () {};
  const onError = typeof options.onError === "function" ? options.onError : function () {};

  let mode = null;
  let stream = null;
  let detector = null;
  let scanTimer = null;
  let html5QrCode = null;
  let active = false;
  let busy = false;

  function showNativeViewport_() {
    if (video) {
      video.hidden = false;
    }

    if (libraryHost) {
      libraryHost.hidden = true;
    }
  }

  function showLibraryViewport_() {
    if (video) {
      video.hidden = true;
      video.srcObject = null;
    }

    if (libraryHost) {
      libraryHost.hidden = false;
    }
  }

  function stopStream_(mediaStream) {
    if (!mediaStream) {
      return;
    }

    mediaStream.getTracks().forEach(function (track) {
      track.stop();
    });
  }

  async function startNativeWithStream_(mediaStream) {
    mode = "native";
    showNativeViewport_();

    try {
      detector = new BarcodeDetector({ formats: ["qr_code"] });
    } catch (error) {
      stopStream_(mediaStream);
      await startLibrary_();
      return;
    }

    stream = mediaStream;
    video.srcObject = stream;

    try {
      await video.play();
    } catch (error) {
      stopStream_(mediaStream);
      throw error;
    }

    active = true;
    onStatus("Apunta al código QR del carnet");
    scanTimer = window.setInterval(scanNativeFrame_, SCAN_INTERVAL_MS);
  }

  async function scanNativeFrame_() {
    if (!active || busy || !detector || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    busy = true;

    try {
      const codes = await detector.detect(video);

      if (codes && codes.length > 0) {
        const value = String(codes[0].rawValue || "").trim();

        if (value) {
          onStatus("Código detectado. Comprobando…");
          await stop();
          onScan(value);
        }
      }
    } catch (error) {
      onError(error);
    } finally {
      busy = false;
    }
  }

  async function startLibrary_() {
    mode = "library";
    showLibraryViewport_();

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

    try {
      await html5QrCode.start({ facingMode: { ideal: "environment" } }, scanConfig, onDecoded_, noopFrame_);
    } catch (error) {
      await html5QrCode.start({ facingMode: "user" }, scanConfig, onDecoded_, noopFrame_);
    }

    onStatus("Apunta al código QR del carnet");
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
    if (active) {
      return;
    }

    if (!mediaStream) {
      throw new Error("No se recibió la cámara");
    }

    if (canUseNativeBarcode_()) {
      await startNativeWithStream_(mediaStream);
      return;
    }

    stopStream_(mediaStream);
    await startLibrary_();
  }

  async function stopNative_() {
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = null;
    }

    stopStream_(stream);
    stream = null;

    if (video) {
      video.srcObject = null;
      video.hidden = false;
    }

    detector = null;
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

    if (mode === "native") {
      await stopNative_();
    } else if (mode === "library") {
      await stopLibrary_();
    }

    mode = null;
  }

  return {
    startWithStream: startWithStream,
    stop: stop,
    isActive: function () {
      return active;
    },
  };
}
