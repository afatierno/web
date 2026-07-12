import { VALIDATION_PAGE_URL } from "./config.js?v=0014";

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

export function buildValidationAccessUrl(validationToken, apiUrl) {
  const encoded = btoa(validationToken + "|" + apiUrl);
  return VALIDATION_PAGE_URL + "?c=" + encodeURIComponent(encoded);
}
