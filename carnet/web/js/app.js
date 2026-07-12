import { fetchCarnet } from "./api.js?v=0002";
import {
  CERTIFIED_PDF_FILENAME,
  CERTIFIED_PDF_URL,
  CONFIG,
  CONFIG_ERROR,
  INFO_MESSAGES,
} from "./config.js?v=0002";
import {
  buildCarnetFields,
  renderCarnetCard,
  renderInfoMessages,
  setStatusMessage,
} from "./render.js?v=0002";
import { APP_VERSION } from "./version.js?v=0002";

const carnetCard = document.getElementById("carnet-card");
const carnetContent = document.getElementById("carnet-content");
const statusMessage = document.getElementById("status-message");
const pdfButton = document.getElementById("pdf-button");
const infoButton = document.getElementById("info-button");
const pdfModal = document.getElementById("pdf-modal");
const infoModal = document.getElementById("info-modal");
const pdfFrame = document.getElementById("pdf-frame");
const pdfDownloadLink = document.getElementById("pdf-download-link");
const pdfOpenLink = document.getElementById("pdf-open-link");
const infoList = document.getElementById("info-list");

let activeController = null;
let openModalId = null;

function configurePdfLinks() {
  pdfFrame.src = CERTIFIED_PDF_URL;
  pdfDownloadLink.href = CERTIFIED_PDF_URL;
  pdfDownloadLink.download = CERTIFIED_PDF_FILENAME;
  pdfOpenLink.href = CERTIFIED_PDF_URL;
}

function setPdfButtonVisible(visible) {
  pdfButton.hidden = !visible;
}

function openModal(modalId) {
  closeModal();

  const modal = modalId === "pdf" ? pdfModal : infoModal;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  openModalId = modalId;
  document.body.classList.add("modal-open");
}

function closeModal() {
  if (!openModalId) {
    return;
  }

  const modal = openModalId === "pdf" ? pdfModal : infoModal;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  openModalId = null;
  document.body.classList.remove("modal-open");
}

function showLoading() {
  carnetCard.hidden = true;
  setPdfButtonVisible(false);
  setStatusMessage(statusMessage, "Cargando carnet…", "loading");
}

function showError(message) {
  carnetCard.hidden = true;
  setPdfButtonVisible(false);
  setStatusMessage(statusMessage, message, "error");
}

function showCarnet(data) {
  const fields = buildCarnetFields(data.headers || [], data.values || []);

  renderCarnetCard(carnetContent, fields);
  carnetCard.hidden = false;
  setPdfButtonVisible(true);
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
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

pdfButton.addEventListener("click", function () {
  openModal("pdf");
});

infoButton.addEventListener("click", function () {
  openModal("info");
});

document.querySelectorAll("[data-close-modal]").forEach(function (element) {
  element.addEventListener("click", function () {
    closeModal();
  });
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && openModalId) {
    closeModal();
  }
});

configurePdfLinks();
renderInfoMessages(infoList, INFO_MESSAGES);
loadCarnet();
