const SCAN_INTERVAL_MS = 180;

export function isScannerSupported() {
  if (!window.isSecureContext) {
    return false;
  }

  return (
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

async function requestVideoStream_() {
  const attempts = [
    {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    {
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    {
      audio: false,
      video: true,
    },
  ];

  let lastError = null;

  for (let i = 0; i < attempts.length; i++) {
    try {
      return await navigator.mediaDevices.getUserMedia(attempts[i]);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No se pudo acceder a ninguna cámara");
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

    detector = new BarcodeDetector({ formats: ["qr_code"] });
    stream = mediaStream;

    video.srcObject = stream;
    await video.play();

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

  async function start() {
    if (active) {
      return;
    }

    if (!isScannerSupported()) {
      throw new Error(
        "Este dispositivo no permite usar la cámara. Abre la página con https:// o localhost."
      );
    }

    onStatus("Solicitando acceso a la cámara…");

    let prestream;

    try {
      prestream = await requestVideoStream_();
    } catch (error) {
      if (error && error.name === "NotAllowedError") {
        throw new Error(
          "Permiso de cámara denegado. En Brave/Chrome: candado o ⋮ en la barra → Cámara → Permitir."
        );
      }

      throw error;
    }

    if (canUseNativeBarcode_()) {
      await startNativeWithStream_(prestream);
      return;
    }

    stopStream_(prestream);
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
    start: start,
    stop: stop,
    isActive: function () {
      return active;
    },
  };
}
