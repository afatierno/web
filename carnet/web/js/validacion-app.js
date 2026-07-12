import {
  CERTIFIED_PDF_FILENAME,
  CERTIFIED_PDF_URL,
  CONFIG,
  CONFIG_ERROR,
  CONFIG_PENDING_REDIRECT,
} from "./validacion-config.js?v=0009";
import { fetchValidation } from "./validacion-api.js?v=0009";

const statusMessage = document.getElementById("status-message");
const resultCard = document.getElementById("result-card");
const resultTitle = document.getElementById("result-title");
const resultBody = document.getElementById("result-body");
const pdfLink = document.getElementById("pdf-link");

let activeController = null;

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message";

  if (type) {
    statusMessage.classList.add("status-message-" + type);
  }
}

function showLoading() {
  resultCard.hidden = true;
  setStatus("Comprobando carnet…", "loading");
}

function showError(message) {
  resultCard.hidden = true;
  setStatus(message, "error");
}

function showValid(numSocio) {
  resultTitle.textContent = "Carnet válido";
  resultBody.textContent = "El carnet del socio " + numSocio + " es válido.";
  resultCard.className = "result-card result-card-valid";
  resultCard.hidden = false;
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

function configurePdfLink() {
  pdfLink.href = CERTIFIED_PDF_URL;
  pdfLink.download = CERTIFIED_PDF_FILENAME;
}

async function loadValidation() {
  if (CONFIG_ERROR || !CONFIG) {
    showError(CONFIG_ERROR || "Enlace de validación no válido");
    return;
  }

  if (activeController) {
    activeController.abort();
  }

  activeController = new AbortController();
  showLoading();

  try {
    const data = await fetchValidation(activeController.signal);
    showValid(data.numSocio);
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }

    showError(error && error.message ? error.message : "No se pudo validar el carnet");
  } finally {
    activeController = null;
  }
}

configurePdfLink();

if (!CONFIG_PENDING_REDIRECT) {
  loadValidation();
}
