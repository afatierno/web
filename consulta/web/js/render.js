function truncateHeader(text, maxLen) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) {
    return clean;
  }

  return `${clean.slice(0, maxLen - 1).trim()}…`;
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

export function createResultsRenderer(elements) {
  const { resultsWrap, tableHead, tableBody, statusEl } = elements;

  function clearResults() {
    resultsWrap.classList.add("hidden");
    tableHead.replaceChildren();
    tableBody.replaceChildren();
  }

  function renderResults(data) {
    resultsWrap.classList.remove("hidden");
    tableHead.replaceChildren();
    tableBody.replaceChildren();

    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      statusEl.textContent = "No se encontraron resultados.";
      return;
    }

    const headers =
      Array.isArray(data.headers) && data.headers.length > 0
        ? data.headers
        : (data.results[0].data || []).map((_, index) => `Columna ${index + 1}`);

    const rows = data.results.map((item) => (Array.isArray(item.data) ? item.data : []));
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

      visibleColumnIndexes.forEach((index) => {
        const td = document.createElement("td");
        td.textContent = values[index] ?? "";
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    });

    statusEl.textContent = `Se encontraron ${data.results.length} resultados.`;
  }

  return { clearResults, renderResults };
}
