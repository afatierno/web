import { CONFIG, CONFIG_ERROR, CONFIG_PENDING_REDIRECT } from "./config.js?v=0017";
import { fetchSearch } from "./api.js?v=0017";
import { clearResultsTable, renderResultsTable } from "./render.js?v=0017";

const queryInput = document.getElementById("query");
const socioNumberInput = document.getElementById("socio-number");
const statusEl = document.getElementById("status");
const resultsCountEl = document.getElementById("results-count");
const requestTimingEl = document.getElementById("request-timing");
const searchForm = document.getElementById("search-form");
const socioSearchForm = document.getElementById("socio-search-form");
const clearButton = document.getElementById("btn-clear");
const clearSocioButton = document.getElementById("btn-clear-socio");
const resultsWrap = document.getElementById("results-wrap");
const tableHead = document.getElementById("table-head");
const tableBody = document.getElementById("table-body");

const resultsElements = {
  resultsWrap,
  tableHead,
  tableBody,
  countEl: resultsCountEl,
};

let debounceTimer = null;
let debounceToken = 0;
let activeAbortController = null;
let searchGeneration = 0;
let lastManualSearch = null;

function socioPrefix() {
  return CONFIG?.SOCIO_NUMBER_PREFIX || "202627";
}

function buildSocioQuery(digits) {
  return socioPrefix() + String(digits || "").replace(/\D/g, "");
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

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

function clearRequestTiming() {
  if (!requestTimingEl) {
    return;
  }

  requestTimingEl.hidden = true;
  requestTimingEl.textContent = "";
}

function clearResults() {
  clearResultsTable(resultsElements);
  clearRequestTiming();

  if (resultsWrap) {
    resultsWrap.classList.add("hidden");
  }
}

function resetStatus() {
  statusEl.classList.remove("error");
  statusEl.textContent = "Escribe al menos 4 caracteres para buscar";
  clearResults();
}

function formatMs(ms) {
  const elapsed = Math.max(0, ms);

  if (elapsed < 1000) {
    return `${Math.round(elapsed)} ms`;
  }

  return `${(elapsed / 1000).toFixed(2)} s`;
}

function formatTimingText(clientMs, data) {
  const count = Array.isArray(data?.results) ? data.results.length : 0;
  const timing = data?.timing;
  let serverPart = "";

  if (timing && typeof timing === "object") {
    serverPart =
      ` · servidor: carga ${formatMs(timing.loadMs)}, búsqueda ${formatMs(timing.searchMs)}` +
      (timing.authMs != null ? `, token ${formatMs(timing.authMs)}` : "") +
      (timing.rowCount != null ? `, ${timing.rowCount} filas en memoria` : "");
  }

  const sources = [];
  if (data?.searchSource) {
    sources.push(`datos: ${data.searchSource}`);
  }
  if (data?.tokenSource) {
    sources.push(`token: ${data.tokenSource}`);
  }

  const sourcePart = sources.length > 0 ? ` · ${sources.join(", ")}` : "";

  return `${formatMs(clientMs)} (cliente)${serverPart}${sourcePart} · ${count} resultados`;
}

function showRequestTiming(clientMs, data) {
  if (!requestTimingEl) {
    return;
  }

  requestTimingEl.hidden = false;
  requestTimingEl.textContent = formatTimingText(clientMs, data);
}

async function handleSearch(query) {
  const generation = ++searchGeneration;
  const abortController = new AbortController();
  activeAbortController = abortController;
  const startedAt = performance.now();

  statusEl.textContent = "Cargando…";
  statusEl.classList.remove("error");
  clearRequestTiming();

  try {
    const data = await fetchSearch(query, abortController.signal);

    if (generation !== searchGeneration) {
      return;
    }

    renderResultsTable(data, {
      ...resultsElements,
      metaEl: statusEl,
    });
    showRequestTiming(performance.now() - startedAt, data);
  } catch (err) {
    if (err.name === "AbortError" || generation !== searchGeneration) {
      return;
    }

    clearResults();
    statusEl.textContent = err.message;
    statusEl.classList.add("error");
  } finally {
    if (activeAbortController === abortController) {
      activeAbortController = null;
    }
  }
}

function clearOtherInput(active) {
  if (active === "query" && socioNumberInput) {
    socioNumberInput.value = "";
  }

  if (active === "socio" && queryInput) {
    queryInput.value = "";
  }
}

function handleClear() {
  cancelActiveSearch();
  clearDebounce();
  lastManualSearch = null;
  queryInput.value = "";
  resetStatus();
  queryInput.focus();
}

function handleClearSocio() {
  cancelActiveSearch();
  clearDebounce();
  lastManualSearch = null;
  socioNumberInput.value = "";
  resetStatus();
  socioNumberInput.focus();
}

function handleManualSearch(event) {
  event.preventDefault();
  cancelActiveSearch();
  clearDebounce();
  clearOtherInput("query");

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

function handleManualSocioSearch(event) {
  event.preventDefault();
  cancelActiveSearch();
  clearDebounce();
  clearOtherInput("socio");

  const digits = digitsOnly(socioNumberInput.value);
  socioNumberInput.value = digits;
  const query = buildSocioQuery(digits);
  clearResults();

  if (digits.length === 0) {
    lastManualSearch = null;
    resetStatus();
    return;
  }

  if (digits.length >= CONFIG.SOCIO_NUMBER_MIN_DIGITS) {
    lastManualSearch = { query, at: Date.now() };
    handleSearch(query);
    return;
  }

  lastManualSearch = null;
  statusEl.classList.remove("error");
  statusEl.textContent =
    "Escribe al menos " + CONFIG.SOCIO_NUMBER_MIN_DIGITS + " dígitos del número de socio";
}

function scheduleSearch(getQuery) {
  const query = getQuery();

  if (wasRecentlyManualSearch(query)) {
    return;
  }

  clearDebounce();
  const token = debounceToken;

  debounceTimer = setTimeout(() => {
    if (token !== debounceToken) {
      return;
    }

    const currentQuery = getQuery();

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

function scheduleSocioSearch() {
  const digits = digitsOnly(socioNumberInput.value);
  const query = buildSocioQuery(digits);

  if (wasRecentlyManualSearch(query)) {
    return;
  }

  clearDebounce();
  const token = debounceToken;

  debounceTimer = setTimeout(() => {
    if (token !== debounceToken) {
      return;
    }

    const currentDigits = digitsOnly(socioNumberInput.value);
    const currentQuery = buildSocioQuery(currentDigits);

    if (wasRecentlyManualSearch(currentQuery)) {
      return;
    }

    clearResults();

    if (currentDigits.length >= CONFIG.SOCIO_NUMBER_MIN_DIGITS) {
      lastManualSearch = null;
      handleSearch(currentQuery);
    } else if (currentDigits.length === 0) {
      resetStatus();
    } else {
      statusEl.classList.remove("error");
      statusEl.textContent =
        "Escribe al menos " + CONFIG.SOCIO_NUMBER_MIN_DIGITS + " dígitos del número de socio";
    }
  }, CONFIG.DEBOUNCE_MS);
}

function onQueryInput() {
  cancelActiveSearch();
  statusEl.classList.remove("error");
  clearOtherInput("query");

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
  clearRequestTiming();
  scheduleSearch(() => queryInput.value.trim());
}

function onSocioNumberInput() {
  cancelActiveSearch();
  statusEl.classList.remove("error");
  clearOtherInput("socio");

  const digits = digitsOnly(socioNumberInput.value);
  if (socioNumberInput.value !== digits) {
    socioNumberInput.value = digits;
  }

  if (digits.length === 0) {
    clearDebounce();
    lastManualSearch = null;
    clearResults();
    resetStatus();
    return;
  }

  const query = buildSocioQuery(digits);

  if (lastManualSearch && lastManualSearch.query !== query) {
    lastManualSearch = null;
  }

  if (digits.length < CONFIG.SOCIO_NUMBER_MIN_DIGITS) {
    clearDebounce();
    lastManualSearch = null;
    clearResults();
    statusEl.classList.remove("error");
    statusEl.textContent =
      "Escribe al menos " + CONFIG.SOCIO_NUMBER_MIN_DIGITS + " dígitos del número de socio";
    clearRequestTiming();
    return;
  }

  statusEl.textContent = "Escribiendo…";
  clearRequestTiming();
  scheduleSocioSearch();
}

function showConfigError(message) {
  statusEl.textContent = message;
  statusEl.classList.add("error");
  queryInput.disabled = true;
  clearButton.disabled = true;
  searchForm.addEventListener("submit", (event) => event.preventDefault());

  if (socioNumberInput) {
    socioNumberInput.disabled = true;
  }
  if (clearSocioButton) {
    clearSocioButton.disabled = true;
  }
  if (socioSearchForm) {
    socioSearchForm.addEventListener("submit", (event) => event.preventDefault());
  }
}

function init() {
  if (CONFIG_PENDING_REDIRECT) {
    return;
  }

  if (CONFIG_ERROR || !CONFIG) {
    showConfigError(CONFIG_ERROR || "Configuración de acceso no válida");
    return;
  }

  const prefixEl = document.querySelector(".socio-number-prefix");
  if (prefixEl) {
    prefixEl.textContent = socioPrefix();
  }

  const searchPanels = Array.from(document.querySelectorAll("details.search-panel"));
  searchPanels.forEach((panel) => {
    panel.addEventListener("toggle", () => {
      if (!panel.open) {
        return;
      }

      searchPanels.forEach((other) => {
        if (other !== panel) {
          other.open = false;
        }
      });
    });
  });

  queryInput.addEventListener("input", onQueryInput);
  searchForm.addEventListener("submit", handleManualSearch);
  clearButton.addEventListener("click", handleClear);

  socioNumberInput.addEventListener("input", onSocioNumberInput);
  socioSearchForm.addEventListener("submit", handleManualSocioSearch);
  clearSocioButton.addEventListener("click", handleClearSocio);
}

init();
