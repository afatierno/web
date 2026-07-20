import { VALIDATION_PAGE_URL } from "./config.js?v=0019";

/** Requiere qrcode-lib.js cargado antes (global qrcode). */
export function renderQrCode(container, text) {
  if (typeof qrcode !== "function") {
    container.textContent = "No se pudo generar el código QR.";
    return;
  }

  const qr = qrcode(0, "H");
  qr.addData(text);
  qr.make();

  const wrap = document.createElement("div");
  wrap.className = "qr-code-image";
  wrap.innerHTML = qr.createImgTag(5, 2, "Código QR de validación del carnet");

  const qrImg = wrap.querySelector("img");

  if (qrImg) {
    qrImg.classList.add("qr-code-matrix");
  }

  container.replaceChildren(wrap);
}

export function buildValidationAccessUrl(validationToken, apiUrl, timestamp) {
  const issuedAt = timestamp != null ? timestamp : Date.now();
  const encoded = btoa(validationToken + "|" + issuedAt + "|" + apiUrl);
  return VALIDATION_PAGE_URL + "?c=" + encodeURIComponent(encoded);
}

let activeQrTimer = null;
let visibilityHandler = null;
let currentQrIssuedAt = 0;

function clearQrTimerOnly_() {
  if (activeQrTimer) {
    clearTimeout(activeQrTimer);
    activeQrTimer = null;
  }
}

export function clearValidationQrTimer() {
  clearQrTimerOnly_();
  unbindVisibilityCheck_();
  currentQrIssuedAt = 0;
}

function unbindVisibilityCheck_() {
  if (!visibilityHandler) {
    return;
  }

  document.removeEventListener("visibilitychange", visibilityHandler);
  window.removeEventListener("pageshow", visibilityHandler);
  visibilityHandler = null;
}

function bindVisibilityCheck_(checkFn) {
  unbindVisibilityCheck_();

  visibilityHandler = function () {
    if (document.visibilityState && document.visibilityState !== "visible") {
      return;
    }

    checkFn();
  };

  document.addEventListener("visibilitychange", visibilityHandler);
  window.addEventListener("pageshow", visibilityHandler);
}

function ensureQrStage(container) {
  let stage = container.querySelector(".validation-qr-stage");

  if (!stage) {
    stage = document.createElement("div");
    stage.className = "validation-qr-stage";

    const qrHost = document.createElement("div");
    qrHost.className = "validation-qr-code";
    stage.appendChild(qrHost);

    container.replaceChildren(stage);
  }

  return {
    stage: stage,
    qrHost: stage.querySelector(".validation-qr-code"),
  };
}

function removeQrRefreshOverlay(stage) {
  const overlay = stage.querySelector(".validation-qr-refresh-overlay");

  if (overlay) {
    overlay.remove();
  }

  stage.classList.remove("is-expired");
}

function isQrExpired_(stage, ttlMs) {
  if (ttlMs <= 0 || !currentQrIssuedAt) {
    return false;
  }

  if (stage.classList.contains("is-expired") || stage.querySelector(".validation-qr-refresh-overlay")) {
    return true;
  }

  return Date.now() - currentQrIssuedAt >= ttlMs;
}

function showQrRefreshOverlay(stage, options) {
  removeQrRefreshOverlay(stage);
  stage.classList.add("is-expired");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "validation-qr-refresh-overlay";

  if (options.reloadIconUrl) {
    const icon = document.createElement("img");
    icon.className = "validation-qr-refresh-icon";
    icon.src = options.reloadIconUrl;
    icon.alt = "";
    icon.decoding = "async";
    button.appendChild(icon);
  }

  button.setAttribute(
    "aria-label",
    (options.reloadLabel || "Pulsa") + " para renovar el código QR"
  );

  button.addEventListener("click", options.onRefresh);
  stage.appendChild(button);
}

export function setupValidationQr(container, validityEl, options) {
  clearValidationQrTimer();

  options = options || {};
  const ttlMs = Number(options.ttlMs) || 0;
  const parts = ensureQrStage(container);
  const stage = parts.stage;
  const qrHost = parts.qrHost;

  function resolveValidationUrl() {
    if (typeof options.getValidationUrl === "function") {
      return options.getValidationUrl();
    }

    return options.validationUrl || "";
  }

  function showExpiredPrompt() {
    clearQrTimerOnly_();
    unbindVisibilityCheck_();

    showQrRefreshOverlay(stage, {
      reloadLabel: options.reloadLabel,
      reloadIconUrl: options.reloadIconUrl,
      onRefresh: function () {
        showActiveQr();
      },
    });

    if (validityEl) {
      validityEl.textContent =
        options.expiredText || "El código ha caducado. Pulsa para generar uno nuevo.";
    }
  }

  function checkExpiryByClock() {
    if (isQrExpired_(stage, ttlMs)) {
      showExpiredPrompt();
    }
  }

  function scheduleExpiry() {
    clearQrTimerOnly_();
    unbindVisibilityCheck_();

    if (ttlMs <= 0) {
      return;
    }

    const remaining = ttlMs - (Date.now() - currentQrIssuedAt);

    if (remaining <= 0) {
      showExpiredPrompt();
      return;
    }

    activeQrTimer = setTimeout(showExpiredPrompt, remaining);
    bindVisibilityCheck_(checkExpiryByClock);
  }

  function showActiveQr() {
    const validationUrl = resolveValidationUrl();

    removeQrRefreshOverlay(stage);
    clearQrTimerOnly_();
    unbindVisibilityCheck_();
    currentQrIssuedAt = Date.now();

    if (!validationUrl) {
      qrHost.textContent = "No se pudo generar el código QR.";
      return;
    }

    renderQrCode(qrHost, validationUrl);

    if (validityEl) {
      validityEl.textContent = options.validityText || "";
      validityEl.hidden = false;
    }

    scheduleExpiry();
  }

  showActiveQr();
}
