import {
  CERTIFIED_PDF_FILENAME,
  CERTIFIED_PDF_URL,
  CONFIG,
  CONFIG_ERROR,
  CONFIG_PENDING_REDIRECT,
} from "./config.js?v=0002";
import { parseValidationQrPayload } from "./qr-parser.js?v=0002";
import { fetchValidation } from "./validation-api.js?v=0002";
import { createQrScanner, isScannerSupported } from "./scanner.js?v=0002";

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

const UNSUPPORTED_BROWSER_MESSAGE =
  "Este navegador no puede escanear QR. Usa Chrome o Safari en un móvil con cámara.";

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
  toggleScannerButton.textContent = "Activar cámara";
  toggleScannerButton.disabled = !isScannerSupported();
}

async function stopScanner() {
  if (scanner && scanner.isActive()) {
    await scanner.stop();
  }

  scannerViewport.hidden = true;
  setScannerStatus("");
}

async function startScanner() {
  const instance = ensureScanner();

  hideResult();
  setStatus("", null);
  scannerViewport.hidden = false;
  toggleScannerButton.hidden = true;
  scanAgainButton.hidden = false;

  try {
    await instance.start();
  } catch (error) {
    scannerViewport.hidden = true;
    toggleScannerButton.hidden = false;
    scanAgainButton.hidden = true;
    setScannerStatus("");
    showError(
      error && error.message
        ? error.message
        : "No se pudo activar la cámara. Usa Chrome o Safari en el móvil."
    );
  }
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
  if (CONFIG_ERROR || !CONFIG) {
    scannerSection.hidden = true;
    showError(CONFIG_ERROR || "Enlace de comercio no válido");
    return;
  }

  scannerSection.hidden = false;
  resetForNextScan();

  if (!isScannerSupported()) {
    setScannerStatus(UNSUPPORTED_BROWSER_MESSAGE);
    toggleScannerButton.disabled = true;
  }
}

toggleScannerButton.addEventListener("click", function () {
  startScanner();
});

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

if (!CONFIG_PENDING_REDIRECT) {
  initMerchantPortal();
}
