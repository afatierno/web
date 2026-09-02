const moduleParams_ = new URL(import.meta.url).searchParams;
const moduleQuery_ =
  "v=" +
  encodeURIComponent(moduleParams_.get("v") || "") +
  "&b=" +
  encodeURIComponent(moduleParams_.get("b") || String(Date.now()));

const { APP_VERSION } = await import("./asset-version.js?" + moduleQuery_);
const {
  CERTIFIED_PDF_FILENAME,
  CERTIFIED_PDF_URL,
  CONFIG,
  CONFIG_ERROR,
  CONFIG_PENDING_REDIRECT,
  REQUIRE_MERCHANT_ACCESS,
} = await import("./config.js?" + moduleQuery_);
const { parseValidationQrPayload } = await import("./qr-parser.js?" + moduleQuery_);
const { fetchValidation } = await import("./validation-api.js?" + moduleQuery_);
const { createQrScanner, formatCameraError, isScannerSupported, requestCameraStreamFromGesture } =
  await import("./scanner.js?" + moduleQuery_);

const scannerSection = document.getElementById("scanner-section");
const scannerViewport = document.getElementById("scanner-viewport");
const scannerVideo = document.getElementById("scanner-video");
const scannerReader = document.getElementById("scanner-reader");
const scannerStatus = document.getElementById("scanner-status");
const toggleScannerButton = document.getElementById("toggle-scanner-button");
const scanAgainButton = document.getElementById("scan-again-button");
const statusMessage = document.getElementById("status-message");
const resultCard = document.getElementById("result-card");
const resultTitle = document.getElementById("result-title");
const resultBody = document.getElementById("result-body");
const pdfLink = document.getElementById("pdf-link");
const appVersion = document.getElementById("app-version");

const CAMERA_PROMPT_MESSAGE =
  "Pulsa «Permitir cámara y escanear». Debe aparecer el aviso del sistema o del navegador.";

let activeController = null;
let scanner = null;
let validating = false;

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message";

  if (type) {
    statusMessage.classList.add("status-message-" + type);
  }
}

function setScannerStatus(message) {
  scannerStatus.textContent = message || "";
}

function hideResult() {
  resultCard.hidden = true;
  resultCard.className = "result-card";
}

function showLoading(message) {
  hideResult();
  setStatus(message || "Comprobando carnet…", "loading");
}

function showError(message) {
  hideResult();
  setStatus(message, "error");
}

function showValid(numSocio) {
  resultTitle.textContent = "Carnet válido";
  resultBody.textContent = "El carnet del socio " + numSocio + " es válido.";
  resultCard.className = "result-card result-card-valid";
  resultCard.hidden = false;
  setStatus("", null);
}

function configurePdfLink() {
  pdfLink.href = CERTIFIED_PDF_URL;
  pdfLink.download = CERTIFIED_PDF_FILENAME;
}

function ensureScanner() {
  if (!scanner) {
    scanner = createQrScanner({
      videoElement: scannerVideo,
      libraryHostElement: scannerReader,
      onScan: function (rawValue) {
        validateRawInput(rawValue);
      },
      onStatus: setScannerStatus,
      onError: function (error) {
        setScannerStatus(
          error && error.message ? error.message : "No se pudo leer la cámara"
        );
      },
    });
  }

  return scanner;
}

function resetForNextScan() {
  hideResult();
  setStatus("", null);
  scanAgainButton.hidden = true;
  toggleScannerButton.hidden = false;
  toggleScannerButton.textContent = "Permitir cámara y escanear";
  toggleScannerButton.disabled = !isScannerSupported();
  updateCameraPermissionHint_();
}

async function updateCameraPermissionHint_() {
  if (!isScannerSupported()) {
    setScannerStatus(
      !window.isSecureContext
        ? "Sin HTTPS: la cámara no está disponible (" + String(window.location.protocol) + ")."
        : "Este navegador no expone la API de cámara."
    );
    return;
  }

  setScannerStatus(CAMERA_PROMPT_MESSAGE);
}

async function stopScanner() {
  if (scanner) {
    await scanner.stop();
  }

  if (scannerVideo) {
    scannerVideo.srcObject = null;
  }

  scannerViewport.hidden = true;
  setScannerStatus("");
}

function handleCameraStartFailure_(error) {
  scannerViewport.hidden = true;
  toggleScannerButton.hidden = false;
  scanAgainButton.hidden = true;
  setScannerStatus("");
  showError(formatCameraError(error));
  resetForNextScan();
}

let scannerStartPending_ = false;

function bindScannerStartButton_(button) {
  button.addEventListener(
    "pointerup",
    function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      event.preventDefault();
      void beginScannerFromUserGestureAsync_();
    },
    false
  );
}

async function beginScannerFromUserGestureAsync_() {
  if (scannerStartPending_) {
    return;
  }

  if (!isScannerSupported()) {
    showError("La cámara no está disponible en este navegador o contexto.");
    return;
  }

  scannerStartPending_ = true;

  try {
    await stopScanner();

    hideResult();
    setStatus("", null);
    scannerViewport.hidden = false;
    toggleScannerButton.hidden = true;
    scanAgainButton.hidden = false;
    setScannerStatus("Pidiendo permiso de cámara al navegador…");

    const stream = await requestCameraStreamFromGesture();

    setScannerStatus("Permiso concedido. Abriendo escáner…");

    try {
      await ensureScanner().startWithStream(stream);
    } catch (error) {
      stopStreamTracks_(stream);
      handleCameraStartFailure_(error);
    }
  } catch (error) {
    handleCameraStartFailure_(error);
  } finally {
    scannerStartPending_ = false;
  }
}

function stopStreamTracks_(stream) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach(function (track) {
    track.stop();
  });
}

async function validateRawInput(rawInput) {
  if (validating) {
    return;
  }

  const parsed = parseValidationQrPayload(rawInput);

  if (parsed.error) {
    showError(parsed.error);
    resetForNextScan();
    return;
  }

  if (activeController) {
    activeController.abort();
  }

  validating = true;
  activeController = new AbortController();
  showLoading("Comprobando carnet…");
  await stopScanner();

  try {
    const data = await fetchValidation(parsed.config, activeController.signal);
    showValid(data.numSocio);
    scanAgainButton.hidden = false;
    toggleScannerButton.hidden = true;
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }

    showError(error && error.message ? error.message : "No se pudo validar el carnet");
    resetForNextScan();
  } finally {
    validating = false;
    activeController = null;
  }
}

function initMerchantPortal() {
  if (REQUIRE_MERCHANT_ACCESS && (CONFIG_ERROR || !CONFIG)) {
    scannerSection.hidden = true;
    showError(CONFIG_ERROR || "Enlace de comercio no válido");
    return;
  }

  if (CONFIG_ERROR) {
    scannerSection.hidden = true;
    showError(CONFIG_ERROR);
    return;
  }

  scannerSection.hidden = false;
  resetForNextScan();
}

bindScannerStartButton_(toggleScannerButton);

scanAgainButton.addEventListener("click", async function () {
  await stopScanner();
  resetForNextScan();
});

window.addEventListener("pagehide", function () {
  if (scanner) {
    scanner.stop();
  }
});

configurePdfLink();

if (appVersion) {
  appVersion.textContent = "v" + APP_VERSION;
}

if (!CONFIG_PENDING_REDIRECT) {
  initMerchantPortal();
}
