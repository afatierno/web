function truncateHeader(text, maxLen) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) {
    return clean;
  }

  return `${clean.slice(0, maxLen - 1).trim()}…`;
}

function normalizePagadoText(text) {
  return String(text ?? "")
    .replace(/\{\{|\}\}/g, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function findPagadoColumnIndex(headers) {
  return headers.findIndex((header) => normalizePagadoText(header) === "pagado");
}

function rowClassForPagadoValue(value) {
  const normalized = normalizePagadoText(value);
  if (normalized === "") {
    return "row-pagado-empty";
  }
  if (normalized === "si") {
    return "row-pagado-si";
  }
  if (normalized === "no") {
    return "row-pagado-no";
  }
  return "";
}

function getVisibleColumnIndexes(headers, rows) {
  const columnCount = Math.max(headers.length, ...rows.map((row) => row.length));
  const visibleColumnIndexes = [];

  for (let index = 0; index < columnCount; index += 1) {
    const hasVisibleValue = rows.some((row) => {
      const value = row[index];
      return value !== undefined && value !== null && String(value).trim() !== "";
    });

    if (hasVisibleValue) {
      visibleColumnIndexes.push(index);
    }
  }

  return visibleColumnIndexes;
}

export function clearResultsTable(elements) {
  const { resultsWrap, tableHead, tableBody, metaEl } = elements;

  if (resultsWrap) {
    resultsWrap.classList.add("hidden");
  }

  if (tableHead) {
    tableHead.replaceChildren();
  }

  if (tableBody) {
    tableBody.replaceChildren();
  }

  if (metaEl) {
    metaEl.textContent = "";
    metaEl.classList.remove("error");
  }
}

export function renderResultsTable(data, elements) {
  const { resultsWrap, tableHead, tableBody, metaEl } = elements;

  if (!tableHead || !tableBody) {
    return;
  }

  tableHead.replaceChildren();
  tableBody.replaceChildren();

  if (!data || !Array.isArray(data.results) || data.results.length === 0) {
    if (resultsWrap) {
      resultsWrap.classList.add("hidden");
    }

    if (metaEl) {
      metaEl.textContent = "No se encontraron resultados.";
      metaEl.classList.remove("error");
    }

    return;
  }

  if (resultsWrap) {
    resultsWrap.classList.remove("hidden");
  }

  const headers =
    Array.isArray(data.headers) && data.headers.length > 0
      ? data.headers
      : (data.results[0].data || []).map((_, index) => `Columna ${index + 1}`);

  const rows = data.results.map((item) => (Array.isArray(item.data) ? item.data : []));
  const pagadoColumnIndex = findPagadoColumnIndex(headers);
  const visibleColumnIndexes = getVisibleColumnIndexes(headers, rows);

  visibleColumnIndexes.forEach((index) => {
    const th = document.createElement("th");
    const fullHeaderText = headers[index] || `Columna ${index + 1}`;
    th.textContent = truncateHeader(fullHeaderText, 30);
    th.title = String(fullHeaderText).replace(/\s+/g, " ").trim();
    tableHead.appendChild(th);
  });

  rows.forEach((values) => {
    const tr = document.createElement("tr");

    if (pagadoColumnIndex >= 0) {
      const pagadoClass = rowClassForPagadoValue(values[pagadoColumnIndex]);
      if (pagadoClass) {
        tr.classList.add(pagadoClass);
      }
    }

    visibleColumnIndexes.forEach((index) => {
      const td = document.createElement("td");
      td.textContent = values[index] ?? "";
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });

  if (metaEl) {
    metaEl.textContent = `Se encontraron ${data.results.length} resultados.`;
    metaEl.classList.remove("error");
  }
}
