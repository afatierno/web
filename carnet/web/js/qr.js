import { VALIDATION_PAGE_URL } from "./config.js?v=0012";

/** Requiere qrcode-lib.js cargado antes (global qrcode). */
export function renderQrCode(container, text) {
  if (typeof qrcode !== "function") {
    container.textContent = "No se pudo generar el código QR.";
    return;
  }

  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  const wrap = document.createElement("div");
  wrap.className = "qr-code-image";
  wrap.innerHTML = qr.createImgTag(5, 2, "Código QR de validación del carnet");
  container.replaceChildren(wrap);
}

export function buildValidationAccessUrl(validationToken, apiUrl, timestamp) {
  const issuedAt = timestamp != null ? timestamp : Date.now();
  const encoded = btoa(validationToken + "|" + issuedAt + "|" + apiUrl);
  return VALIDATION_PAGE_URL + "?c=" + encodeURIComponent(encoded);
}

let activeQrTimer = null;

export function clearValidationQrTimer() {
  if (activeQrTimer) {
    clearTimeout(activeQrTimer);
    activeQrTimer = null;
  }
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

  function showActiveQr() {
    const validationUrl = resolveValidationUrl();

    removeQrRefreshOverlay(stage);

    if (!validationUrl) {
      qrHost.textContent = "No se pudo generar el código QR.";
      return;
    }

    renderQrCode(qrHost, validationUrl);

    if (validityEl) {
      validityEl.textContent = options.validityText || "";
      validityEl.hidden = false;
    }
  }

  function showExpiredPrompt() {
    showQrRefreshOverlay(stage, {
      reloadLabel: options.reloadLabel,
      reloadIconUrl: options.reloadIconUrl,
      onRefresh: function () {
        showActiveQr();
        scheduleExpiry();
      },
    });

    if (validityEl) {
      validityEl.textContent =
        options.expiredText || "El código ha caducado. Pulsa para generar uno nuevo.";
    }
  }

  function scheduleExpiry() {
    clearValidationQrTimer();

    if (ttlMs <= 0) {
      return;
    }

    activeQrTimer = setTimeout(showExpiredPrompt, ttlMs);
  }

  showActiveQr();
  scheduleExpiry();
}
