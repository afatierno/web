function hasText(value) {
  return String(value || "").trim().length > 0;
}

function formatFieldLabel(header) {
  const label = String(header || "").trim();

  if (/^Tutor\s*[12]$/i.test(label)) {
    return "Tutor/a";
  }

  if (/^Alumno\s*[1-4]$/i.test(label)) {
    return "Alumno/a";
  }

  return label;
}

export function buildCarnetFields(headers, values) {
  const fields = [];

  headers.forEach(function (header, index) {
    const value = values[index];

    if (!hasText(value)) {
      return;
    }

    fields.push({
      label: formatFieldLabel(header),
      value: String(value).trim(),
    });
  });

  return fields;
}

export function renderCarnetCard(container, fields) {
  container.replaceChildren();

  if (!fields.length) {
    const empty = document.createElement("p");
    empty.className = "carnet-empty";
    empty.textContent = "No hay datos para mostrar en este carnet.";
    container.appendChild(empty);
    return;
  }

  const list = document.createElement("dl");
  list.className = "carnet-fields";

  fields.forEach(function (field, index) {
    const row = document.createElement("div");
    row.className = "carnet-field" + (index === 0 ? " carnet-field-primary" : "");

    const term = document.createElement("dt");
    term.textContent = field.label;

    const definition = document.createElement("dd");
    definition.textContent = field.value;

    row.appendChild(term);
    row.appendChild(definition);
    list.appendChild(row);
  });

  container.appendChild(list);
  scheduleCarnetTypographyFit_(container);
}

export function refitCarnetTypography(container) {
  scheduleCarnetTypographyFit_(container);
}

function scheduleCarnetTypographyFit_(container) {
  const runFit = function () {
    fitCarnetTypography_(container);
  };

  requestAnimationFrame(function () {
    requestAnimationFrame(runFit);
  });

  window.setTimeout(runFit, 120);
  window.setTimeout(runFit, 400);
}

let carnetTypographyObserver_ = null;
let carnetViewportFitAttached_ = false;

function fitCarnetTypography_(container) {
  const fitAll = function () {
    container.querySelectorAll(".carnet-field dd").forEach(function (definition) {
      fitCarnetValue_(definition, definition.closest(".carnet-field-primary") !== null);
    });
  };

  fitAll();

  if (typeof ResizeObserver === "undefined") {
    attachCarnetViewportFit_(fitAll);
    return;
  }

  if (carnetTypographyObserver_) {
    carnetTypographyObserver_.disconnect();
  }

  carnetTypographyObserver_ = new ResizeObserver(function () {
    fitAll();
  });
  carnetTypographyObserver_.observe(container);

  attachCarnetViewportFit_(fitAll);
}

function attachCarnetViewportFit_(fitAll) {
  if (carnetViewportFitAttached_) {
    return;
  }

  carnetViewportFitAttached_ = true;

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitAll, { passive: true });
  }

  window.addEventListener("orientationchange", function () {
    window.setTimeout(fitAll, 150);
  });
}

function getCarnetFieldContentWidth_(fieldElement) {
  const styles = getComputedStyle(fieldElement);
  const padding =
    parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  const measured = fieldElement.clientWidth - padding;

  if (measured > 0) {
    return measured;
  }

  const card = fieldElement.closest(".carnet-card");

  if (card && card.clientWidth > 0) {
    const cardStyles = getComputedStyle(card);
    const cardPadding =
      parseFloat(cardStyles.paddingLeft) + parseFloat(cardStyles.paddingRight);

    return Math.max(0, card.clientWidth - cardPadding - padding);
  }

  const viewportWidth = window.visualViewport
    ? window.visualViewport.width
    : window.innerWidth;
  const rootStyles = getComputedStyle(document.documentElement);
  const pagePadding = parseFloat(rootStyles.getPropertyValue("--page-padding-x")) || 12;

  return Math.max(0, viewportWidth - pagePadding * 2 - padding);
}

function getCarnetFontBounds_(isPrimary) {
  const isMobileLayout = window.matchMedia("(max-width: 640px)").matches;

  if (isPrimary) {
    return {
      maxPx: isMobileLayout ? 56 : 46,
      minPx: isMobileLayout ? 28 : 20,
    };
  }

  return {
    maxPx: isMobileLayout ? 46 : 38,
    minPx: isMobileLayout ? 24 : 18,
  };
}

function fitCarnetValue_(element, isPrimary) {
  const field = element.closest(".carnet-field");

  if (!field) {
    return;
  }

  const maxWidth = getCarnetFieldContentWidth_(field);

  if (maxWidth <= 0) {
    return;
  }

  const bounds = getCarnetFontBounds_(isPrimary);
  const maxPx = bounds.maxPx;
  const minPx = bounds.minPx;

  element.style.width = "100%";
  element.style.whiteSpace = "nowrap";

  let bestSize = minPx;

  for (let size = minPx; size <= maxPx; size += 0.5) {
    element.style.fontSize = size + "px";

    if (element.scrollWidth <= maxWidth) {
      bestSize = size;
      continue;
    }

    break;
  }

  element.style.fontSize = bestSize + "px";

  if (element.scrollWidth <= maxWidth) {
    return;
  }

  element.style.whiteSpace = "normal";

  for (let size = maxPx; size >= minPx; size -= 0.5) {
    element.style.fontSize = size + "px";

    if (element.scrollWidth <= maxWidth) {
      return;
    }
  }

  element.style.fontSize = minPx + "px";
}

export function renderInfoMessages(listElement, messages) {
  listElement.replaceChildren();

  messages.forEach(function (segments) {
    const item = document.createElement("li");

    segments.forEach(function (segment) {
      if (segment.type === "link") {
        const link = document.createElement("a");
        link.href = segment.href;
        link.textContent = segment.label;
        link.className = "text-link";

        if (segment.href.indexOf("http") === 0) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }

        item.appendChild(link);
        return;
      }

      item.appendChild(document.createTextNode(segment.value));
    });

    listElement.appendChild(item);
  });
}

export function setStatusMessage(element, message, type) {
  element.textContent = message;
  element.className = "status-message";

  if (type) {
    element.classList.add("status-message-" + type);
  }
}
