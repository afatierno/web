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

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      fitCarnetTypography_(container);
    });
  });
}

let carnetTypographyObserver_ = null;

function fitCarnetTypography_(container) {
  const fitAll = function () {
    container.querySelectorAll(".carnet-field dd").forEach(function (definition) {
      fitCarnetValue_(definition, definition.closest(".carnet-field-primary") !== null);
    });
  };

  fitAll();

  if (typeof ResizeObserver === "undefined") {
    return;
  }

  if (carnetTypographyObserver_) {
    carnetTypographyObserver_.disconnect();
  }

  carnetTypographyObserver_ = new ResizeObserver(function () {
    fitAll();
  });
  carnetTypographyObserver_.observe(container);
}

function getCarnetFieldContentWidth_(fieldElement) {
  const styles = getComputedStyle(fieldElement);

  return (
    fieldElement.clientWidth -
    parseFloat(styles.paddingLeft) -
    parseFloat(styles.paddingRight)
  );
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

  const maxPx = isPrimary ? 46 : 38;
  const minPx = isPrimary ? 20 : 18;

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
