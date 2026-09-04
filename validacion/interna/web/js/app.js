const FIELD_LABELS = {
  "Numero de Socio": "Número de socio",
  "Tutor 1": "Tutor/a 1",
  "Tutor 2": "Tutor/a 2",
  "Alumno 1": "Alumno/a 1",
  "Alumno 2": "Alumno/a 2",
  "Alumno 3": "Alumno/a 3",
  "Alumno 4": "Alumno/a 4",
};

const moduleParams_ = new URL(import.meta.url).searchParams;
const moduleQuery_ =
  "v=" +
  encodeURIComponent(moduleParams_.get("v") || "") +
  "&b=" +
  encodeURIComponent(moduleParams_.get("b") || String(Date.now()));

const {
  CONFIG,
  CONFIG_ERROR,
  CONFIG_PENDING_REDIRECT,
  REQUIRE_INTERNAL_ACCESS,
  clearAccessSession,
} = await import("./config.js?" + moduleQuery_);
const { parseValidationQrPayload } = await import("./qr-parser.js?" + moduleQuery_);
const { fetchCarnetDetail } = await import("./validation-api.js?" + moduleQuery_);
const { fetchInternalAccess } = await import("./access-api.js?" + moduleQuery_);
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
const familyDetails = document.getElementById("family-details");
const accessLabel = document.getElementById("access-label");
const accessUser = document.getElementById("access-user");

const CAMERA_PROMPT_MESSAGE =
  "Pulsa «Permitir cámara y escanear». Debe aparecer el aviso del sistema o del navegador.";

const CAMERA_DENIED_MESSAGE =
  "Cámara bloqueada. Actívala en los permisos del sitio y recarga la página.";

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
  resultBody.hidden = true;
  resultBody.textContent = "";
  familyDetails.innerHTML = "";
}

function showLoading(message) {
  hideResult();
  setStatus(message || "Comprobando carnet…", "loading");
}

function showError(message) {
  hideResult();
  setStatus(message, "error");
}

function labelForField_(header) {
  return FIELD_LABELS[header] || header;
}

function showFamilyDetails(headers, values) {
  resultTitle.textContent = "Datos de la familia";
  resultBody.hidden = true;
  familyDetails.innerHTML = "";

  headers.forEach(function (header, index) {
    const value = String(values[index] || "").trim();

    if (!value) {
      return;
    }

    const dt = document.createElement("dt");
    dt.textContent = labelForField_(header);

    const dd = document.createElement("dd");
    dd.textContent = value;

    familyDetails.appendChild(dt);
    familyDetails.appendChild(dd);
  });

  resultCard.className = "result-card result-card-valid";
  resultCard.hidden = false;
  setStatus("", null);
}

function showInvalid(message) {
  resultTitle.textContent = "Carnet no válido";
  resultBody.textContent = message || "No se pudo validar el carnet.";
  resultBody.hidden = false;
  familyDetails.innerHTML = "";
  resultCard.className = "result-card result-card-invalid";
  resultCard.hidden = false;
  setStatus("", null);
}

function showScanResultActions() {
  scanAgainButton.hidden = false;
  toggleScannerButton.hidden = true;
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

function resetForNextScan(options) {
  options = options || {};

  hideResult();
  setStatus("", null);
  scanAgainButton.hidden = true;
  toggleScannerButton.hidden = false;
  toggleScannerButton.textContent = "Permitir cámara y escanear";
  toggleScannerButton.disabled = !isScannerSupported();

  void updateScannerEntry_(options.autoStart !== false);
}

async function queryCameraPermission_() {
  if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
    return "unknown";
  }

  try {
    const status = await navigator.permissions.query({ name: "camera" });
    return status.state;
  } catch {
    return "unknown";
  }
}

async function updateScannerEntry_(autoStart) {
  if (!isScannerSupported()) {
    setScannerStatus(
      !window.isSecureContext
        ? "Sin HTTPS: la cámara no está disponible (" + String(window.location.protocol) + ")."
        : "Este navegador no expone la API de cámara."
    );
    return;
  }

  const permissionState = await queryCameraPermission_();

  if (permissionState === "denied") {
    setScannerStatus(CAMERA_DENIED_MESSAGE);
    toggleScannerButton.disabled = true;
    return;
  }

  if (autoStart && permissionState === "granted") {
    toggleScannerButton.hidden = true;
    await beginScannerFromUserGestureAsync_(true);
    return;
  }

  if (permissionState === "granted") {
    setScannerStatus("Permiso de cámara concedido. Pulsa el botón para escanear.");
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
  resetForNextScan({ autoStart: false });
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
      void beginScannerFromUserGestureAsync_(false);
    },
    false
  );
}

async function beginScannerFromUserGestureAsync_(alreadyGranted) {
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
    setScannerStatus(
      alreadyGranted ? "Abriendo escáner…" : "Pidiendo permiso de cámara al navegador…"
    );

    const stream = await requestCameraStreamFromGesture();

    if (!alreadyGranted) {
      setScannerStatus("Permiso concedido. Abriendo escáner…");
    }

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
    await stopScanner();
    showInvalid(parsed.error);
    showScanResultActions();
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
    const data = await fetchCarnetDetail(parsed.config, activeController.signal);
    showFamilyDetails(data.headers, data.values);
    showScanResultActions();
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }

    showInvalid(error && error.message ? error.message : "No se pudo validar el carnet");
    showScanResultActions();
  } finally {
    validating = false;
    activeController = null;
  }
}

function showAccessUser(name) {
  if (!accessLabel || !accessUser) {
    return;
  }

  accessUser.textContent = name;
  accessLabel.hidden = false;
}

function hideAccessUser() {
  if (accessLabel) {
    accessLabel.hidden = true;
  }

  if (accessUser) {
    accessUser.textContent = "";
  }
}

async function initInternalPortal() {
  if (REQUIRE_INTERNAL_ACCESS && (CONFIG_ERROR || !CONFIG)) {
    scannerSection.hidden = true;
    hideAccessUser();
    showError(CONFIG_ERROR || "Enlace de acceso interno no válido");
    return;
  }

  if (CONFIG_ERROR) {
    scannerSection.hidden = true;
    hideAccessUser();
    showError(CONFIG_ERROR);
    return;
  }

  if (REQUIRE_INTERNAL_ACCESS && CONFIG) {
    showLoading("Comprobando acceso interno…");

    try {
      const access = await fetchInternalAccess(CONFIG);
      showAccessUser(access.propietario);
    } catch (error) {
      clearAccessSession();
      scannerSection.hidden = true;
      hideAccessUser();
      showError(
        error && error.message ? error.message : "No se pudo comprobar el acceso interno"
      );
      return;
    }
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

if (!CONFIG_PENDING_REDIRECT) {
  void initInternalPortal();
}
