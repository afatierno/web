function hasText(value) {
  return String(value || "").trim().length > 0;
}

export function buildCarnetFields(headers, values) {
  const fields = [];

  headers.forEach(function (header, index) {
    const value = values[index];

    if (!hasText(value)) {
      return;
    }

    fields.push({
      label: String(header || "").trim(),
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
