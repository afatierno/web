import { CONFIG, CONFIG_ERROR, CONFIG_PENDING_REDIRECT } from "./config.js?v=0002";
import { fetchSearch } from "./api.js";
import { createResultsRenderer } from "./render.js";

const queryInput = document.getElementById("query");
const statusEl = document.getElementById("status");
const searchForm = document.getElementById("search-form");
const clearButton = document.getElementById("btn-clear");
const tableHead = document.getElementById("table-head");
const tableBody = document.getElementById("table-body");
const resultsWrap = document.getElementById("results-wrap");

const { clearResults, renderResults } = createResultsRenderer({
  resultsWrap,
  tableHead,
  tableBody,
  statusEl,
});

let debounceTimer = null;
let debounceToken = 0;
let activeAbortController = null;
let searchGeneration = 0;
let lastManualSearch = null;

function clearDebounce() {
  debounceToken += 1;
  clearTimeout(debounceTimer);
  debounceTimer = null;
}

function wasRecentlyManualSearch(query) {
  if (!lastManualSearch) {
    return false;
  }

  if (lastManualSearch.query !== query) {
    return false;
  }

  return Date.now() - lastManualSearch.at < CONFIG.DEBOUNCE_MS;
}

function cancelActiveSearch() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }

  searchGeneration += 1;
}

function resetStatus() {
  statusEl.classList.remove("error");
  statusEl.textContent = "Escribe al menos 4 caracteres para buscar";
}

function handleClear() {
  cancelActiveSearch();
  clearDebounce();
  lastManualSearch = null;
  queryInput.value = "";
  clearResults();
  resetStatus();
  queryInput.focus();
}

async function handleSearch(query) {
  const generation = ++searchGeneration;
  const abortController = new AbortController();
  activeAbortController = abortController;

  statusEl.textContent = "Cargando…";
  statusEl.classList.remove("error");

  try {
    const data = await fetchSearch(query, abortController.signal);

    if (generation !== searchGeneration) {
      return;
    }

    renderResults(data);
  } catch (err) {
    if (err.name === "AbortError" || generation !== searchGeneration) {
      return;
    }

    statusEl.textContent = err.message;
    statusEl.classList.add("error");
  } finally {
    if (activeAbortController === abortController) {
      activeAbortController = null;
    }
  }
}

function handleManualSearch(event) {
  event.preventDefault();
  cancelActiveSearch();
  clearDebounce();

  const query = queryInput.value.trim();
  clearResults();

  if (query.length === 0) {
    lastManualSearch = null;
    resetStatus();
    return;
  }

  if (query.length >= CONFIG.MIN_MANUAL_QUERY_LENGTH) {
    lastManualSearch = { query, at: Date.now() };
    handleSearch(query);
    return;
  }

  lastManualSearch = null;
  statusEl.classList.remove("error");
  statusEl.textContent = "Escribe al menos 3 caracteres para buscar con Enter";
}

function scheduleSearch() {
  const query = queryInput.value.trim();

  if (wasRecentlyManualSearch(query)) {
    return;
  }

  clearDebounce();
  const token = debounceToken;

  debounceTimer = setTimeout(() => {
    if (token !== debounceToken) {
      return;
    }

    const currentQuery = queryInput.value.trim();

    if (wasRecentlyManualSearch(currentQuery)) {
      return;
    }

    clearResults();

    if (currentQuery.length >= CONFIG.MIN_QUERY_LENGTH) {
      lastManualSearch = null;
      handleSearch(currentQuery);
    } else {
      resetStatus();
    }
  }, CONFIG.DEBOUNCE_MS);
}

function onQueryInput() {
  cancelActiveSearch();
  statusEl.classList.remove("error");

  const query = queryInput.value.trim();

  if (query.length === 0) {
    clearDebounce();
    lastManualSearch = null;
    clearResults();
    resetStatus();
    return;
  }

  if (lastManualSearch && lastManualSearch.query !== query) {
    lastManualSearch = null;
  }

  statusEl.textContent = "Escribiendo…";
  scheduleSearch();
}

function showConfigError(message) {
  statusEl.textContent = message;
  statusEl.classList.add("error");
  queryInput.disabled = true;
  clearButton.disabled = true;
  searchForm.addEventListener("submit", (event) => event.preventDefault());
}

function init() {
  if (CONFIG_PENDING_REDIRECT) {
    return;
  }

  if (CONFIG_ERROR || !CONFIG) {
    showConfigError(CONFIG_ERROR || "Configuración de acceso no válida");
    return;
  }

  queryInput.addEventListener("input", onQueryInput);
  searchForm.addEventListener("submit", handleManualSearch);
  clearButton.addEventListener("click", handleClear);
}

init();
