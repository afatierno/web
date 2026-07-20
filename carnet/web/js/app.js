import {
  CARNET_VALIDITY_TEXT,
  CONFIG,
  CONFIG_ERROR,
  CONFIG_PENDING_REDIRECT,
  INFO_MESSAGES,
  QR_DISPLAY_TTL_MS,
  QR_RELOAD_ICON_URL,
  QR_RELOAD_LABEL,
} from "./config.js";
import {
  buildCarnetFields,
  refitCarnetTypography,
  renderCarnetCard,
  renderInfoMessages,
  setStatusMessage,
} from "./render.js?v=0003";
import { fetchCarnet } from "./api.js";
import { buildValidationAccessUrl, clearValidationQrTimer, setupValidationQr } from "./qr.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const carnetCard = document.getElementById("carnet-card");
const carnetContent = document.getElementById("carnet-content");
const validationQrSection = document.getElementById("validation-qr-section");
const validationQr = document.getElementById("validation-qr");
const validationQrValidity = document.getElementById("validation-qr-validity");
const statusMessage = document.getElementById("status-message");
const infoButton = document.getElementById("info-button");
const infoModal = document.getElementById("info-modal");
const infoList = document.getElementById("info-list");

let activeController = null;
let openModalId = null;

function openModal() {
  infoModal.hidden = false;
  infoModal.classList.add("is-open");
  infoModal.setAttribute("aria-hidden", "false");
  openModalId = "info";
  document.body.classList.add("modal-open");
}

function closeModal() {
  if (!openModalId) {
    return;
  }

  infoModal.hidden = true;
  infoModal.classList.remove("is-open");
  infoModal.setAttribute("aria-hidden", "true");
  openModalId = null;
  document.body.classList.remove("modal-open");
}

function showLoading() {
  clearValidationQrTimer();
  carnetCard.hidden = true;
  setStatusMessage(statusMessage, "Cargando carnet…", "loading");
}

function showError(message) {
  clearValidationQrTimer();
  carnetCard.hidden = true;
  setStatusMessage(statusMessage, message, "error");
}

function showCarnet(data) {
  const fields = buildCarnetFields(data.headers || [], data.values || []);

  carnetCard.hidden = false;
  statusMessage.textContent = "";
  statusMessage.className = "status-message";

  renderCarnetCard(carnetContent, fields);
  refitCarnetTypography(carnetContent);

  const validationToken = String(data.validationToken || "").trim();

  if (validationToken && UUID_V4_REGEX.test(validationToken) && CONFIG) {
    setupValidationQr(validationQr, validationQrValidity, {
      getValidationUrl: function () {
        return buildValidationAccessUrl(validationToken, CONFIG.API_URL);
      },
      ttlMs: QR_DISPLAY_TTL_MS,
      validityText: CARNET_VALIDITY_TEXT,
      reloadLabel: QR_RELOAD_LABEL,
      reloadIconUrl: QR_RELOAD_ICON_URL,
    });
    validationQrSection.hidden = false;
  } else {
    clearValidationQrTimer();
    validationQrSection.hidden = true;
    validationQr.replaceChildren();
    validationQrValidity.textContent = "";
  }
}

async function loadCarnet() {
  if (CONFIG_ERROR || !CONFIG) {
    showError(CONFIG_ERROR || "Configuración de acceso no válida");
    return;
  }

  if (activeController) {
    activeController.abort();
  }

  activeController = new AbortController();
  showLoading();

  try {
    const data = await fetchCarnet(activeController.signal);
    showCarnet(data);
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }

    showError(error && error.message ? error.message : "No se pudo cargar el carnet");
  } finally {
    activeController = null;
  }
}

infoButton.addEventListener("click", openModal);

document.querySelectorAll("[data-close-modal]").forEach(function (element) {
  element.addEventListener("click", closeModal);
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && openModalId) {
    closeModal();
  }
});

renderInfoMessages(infoList, INFO_MESSAGES);

if (!CONFIG_PENDING_REDIRECT) {
  loadCarnet();
}
