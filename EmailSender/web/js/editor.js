const visualEditor = document.getElementById("visualEditor");
const htmlOutput = document.getElementById("htmlOutput");
const statusBar = document.getElementById("statusBar");
const charCounter = document.getElementById("charCounter");
const copyHtmlButton = document.getElementById("copyHtmlButton");
const applyHtmlButton = document.getElementById("applyHtmlButton");
const embeddedImageInput = document.getElementById("embeddedImageInput");
const linkedImageButton = document.getElementById("linkedImageButton");
const imageToolsLabel = document.getElementById("imageToolsLabel");
const fontFamilySelect = document.getElementById("fontFamilySelect");
const fontSizeSelect = document.getElementById("fontSizeSelect");
const textColorInput = document.getElementById("textColorInput");
const backgroundColorInput = document.getElementById("backgroundColorInput");
const imageTools = document.getElementById("imageTools");
const imageWidthInput = document.getElementById("imageWidthInput");
const imageWidthUnit = document.getElementById("imageWidthUnit");
const imageResizeOverlay = document.getElementById("imageResizeOverlay");
const resizeHandle = imageResizeOverlay.querySelector(".resize-handle");
const editorContainer = visualEditor.parentElement;
const imageResizeDialog = document.getElementById("imageResizeDialog");
const imageResizeOriginal = document.getElementById("imageResizeOriginal");
const imageResizeFinal = document.getElementById("imageResizeFinal");
const imageResizeChars = document.getElementById("imageResizeChars");
const confirmImageInsertButton = document.getElementById("confirmImageInsert");
const cancelImageInsertButton = document.getElementById("cancelImageInsert");
const closeImageResizeDialogButton = document.getElementById("closeImageResizeDialog");
const linkedImageModal = document.getElementById("linkedImageModal");
const linkedImageBackdrop = document.getElementById("linkedImageBackdrop");
const linkedImageUrlInput = document.getElementById("linkedImageUrlInput");
const linkedImageError = document.getElementById("linkedImageError");
const confirmLinkedImageButton = document.getElementById("confirmLinkedImage");
const cancelLinkedImageButton = document.getElementById("cancelLinkedImage");
const closeLinkedImageDialogButton = document.getElementById("closeLinkedImageDialog");

const SYNC_DELAY_MS = 450;
const IMAGE_MAX_DIMENSION = 200;
const IMAGE_JPEG_QUALITY = 0.78;
const SHEET_CELL_CHAR_LIMIT = 50000;

let pendingImageInsert = null;
let savedEditorRange = null;
let savedImageInsertRange = null;

let syncingFromHtml = false;
let selectedImage = null;
let imageIdCounter = 0;
let syncTimer = null;
let isResizingImage = false;

/** @type {Map<string, string>} */
const imageStore = new Map();

/** @type {Map<string, string>} */
const blobUrlStore = new Map();

function setStatus(message) {
  statusBar.textContent = message;
}

function getHtmlCharCount() {
  if (document.activeElement === htmlOutput) {
    return expandImagePlaceholders(htmlOutput.value.trim()).length;
  }

  return buildExportHtml().length;
}

function updateCharCounter() {
  const count = getHtmlCharCount();
  const formattedLimit = SHEET_CELL_CHAR_LIMIT.toLocaleString("es-ES");

  charCounter.textContent = count.toLocaleString("es-ES") + " / " + formattedLimit;
  charCounter.classList.remove("char-counter-warn", "char-counter-over");

  if (count > SHEET_CELL_CHAR_LIMIT) {
    charCounter.classList.add("char-counter-over");
  } else if (count > SHEET_CELL_CHAR_LIMIT * 0.9) {
    charCounter.classList.add("char-counter-warn");
  }
}

function focusEditor() {
  visualEditor.focus();
}

function exec(command, value) {
  focusEditor();
  document.execCommand(command, false, value || null);
  scheduleSyncHtml();
}

function wrapSelectionWithStyle(styleText) {
  focusEditor();
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    exec("insertHTML", '<span style="' + styleText + '">' + "\u200B" + "</span>");
    return;
  }

  const span = document.createElement("span");
  span.setAttribute("style", styleText);
  span.appendChild(range.extractContents());
  range.insertNode(span);
  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  newRange.collapse(false);
  selection.addRange(newRange);
  scheduleSyncHtml();
}

function normalizeEditorHtml(html) {
  return html
    .replace(/\u200B/g, "")
    .replace(/<div><br><\/div>/gi, "<br>")
    .replace(/^<div>/i, "")
    .replace(/<\/div>$/i, "")
    .replace(/\s*data-image-id="[^"]*"/g, "")
    .replace(/\s*data-image-mode="[^"]*"/g, "")
    .trim();
}

function isLinkedImage(img) {
  return img && img.dataset.imageMode === "linked";
}

function isEmbeddedImage(img) {
  if (!img || isLinkedImage(img)) {
    return false;
  }

  const id = img.dataset.imageId;

  return !!(id && imageStore.has(id));
}

function createImageId() {
  imageIdCounter += 1;
  return "img-" + imageIdCounter;
}

function dataUrlToBlobUrl(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

function revokeBlobUrl(id) {
  const blobUrl = blobUrlStore.get(id);

  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrlStore.delete(id);
  }
}

function ensureImageRecord(img) {
  if (isLinkedImage(img) || /^https?:\/\//i.test(img.getAttribute("src") || "")) {
    img.dataset.imageMode = "linked";
    return "";
  }

  img.dataset.imageMode = "embedded";

  if (!img.dataset.imageId) {
    img.dataset.imageId = createImageId();
  }

  const id = img.dataset.imageId;

  if (img.src.startsWith("data:")) {
    imageStore.set(id, img.src);
    const blobUrl = dataUrlToBlobUrl(img.src);
    revokeBlobUrl(id);
    blobUrlStore.set(id, blobUrl);
    img.src = blobUrl;
  } else if (!imageStore.has(id) && img.src.startsWith("blob:")) {
    blobUrlStore.set(id, img.src);
  }

  return id;
}

function ensureAllImageRecords() {
  visualEditor.querySelectorAll("img").forEach(ensureImageRecord);
}

function expandImagePlaceholders(html) {
  return html.replace(/\[\[IMAGE:([^\]]+)\]\]/g, function (_match, id) {
    return imageStore.get(id) || _match;
  });
}

function serializeHtmlCompact() {
  ensureAllImageRecords();

  const clone = visualEditor.cloneNode(true);

  clone.querySelectorAll("img").forEach(function (img) {
    const id = img.getAttribute("data-image-id");

    if (id && imageStore.has(id)) {
      img.setAttribute("src", "[[IMAGE:" + id + "]]");
    }
  });

  return normalizeEditorHtml(clone.innerHTML);
}

function buildExportHtml() {
  ensureAllImageRecords();

  const clone = visualEditor.cloneNode(true);

  clone.querySelectorAll("img").forEach(function (img) {
    const id = img.getAttribute("data-image-id") || img.dataset.imageId;
    const dataUrl = id && imageStore.get(id);

    img.removeAttribute("contenteditable");
    img.removeAttribute("draggable");

    if (dataUrl) {
      img.setAttribute("src", dataUrl);
      return;
    }

    if (img.getAttribute("src") && img.getAttribute("src").indexOf("blob:") === 0) {
      img.removeAttribute("src");
    }
  });

  return normalizeEmojisForExport(normalizeEditorHtml(clone.innerHTML));
}

function normalizeEmojisForExport(text) {
  const value = String(text || "");
  let result = "";
  let index = 0;

  while (index < value.length) {
    if (value.charAt(index) === "&") {
      const entityEnd = value.indexOf(";", index);

      if (entityEnd !== -1 && entityEnd - index < 16) {
        const entity = value.substring(index, entityEnd + 1);

        if (/^&#(?:x[0-9a-fA-F]+|\d+);$/.test(entity) || /^&[a-zA-Z][a-zA-Z0-9]*;/.test(entity)) {
          result += entity;
          index = entityEnd + 1;
          continue;
        }
      }
    }

    const codePoint = value.codePointAt(index);

    if (isEmojiCodePoint(codePoint)) {
      result += "&#x" + codePoint.toString(16).toUpperCase() + ";";
      index += codePoint > 0xffff ? 2 : 1;
      continue;
    }

    result += String.fromCodePoint(codePoint);
    index += codePoint > 0xffff ? 2 : 1;
  }

  return result;
}

function isEmojiCodePoint(codePoint) {
  if (codePoint < 0x80) {
    return false;
  }

  if (codePoint === 0x200d || codePoint === 0xfe0f) {
    return true;
  }

  return (
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x1f600 && codePoint <= 0x1f64f) ||
    (codePoint >= 0x1f680 && codePoint <= 0x1f6ff) ||
    (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
    (codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff) ||
    (codePoint >= 0x2600 && codePoint <= 0x26ff) ||
    (codePoint >= 0x2700 && codePoint <= 0x27bf) ||
    (codePoint >= 0x2300 && codePoint <= 0x23ff) ||
    (codePoint >= 0x2b05 && codePoint <= 0x2b55) ||
    codePoint === 0x2764 ||
    codePoint === 0x24c2 ||
    codePoint === 0x00a9 ||
    codePoint === 0x00ae ||
    codePoint === 0x203c ||
    codePoint === 0x2049
  );
}

function flushSyncHtml(options) {
  const silent = options && options.silent;

  if (syncingFromHtml || isResizingImage) {
    return;
  }

  syncTimer = null;
  const nextHtml = buildExportHtml();

  if (htmlOutput.value !== nextHtml) {
    htmlOutput.value = nextHtml;
  }

  if (!silent) {
    setStatus("HTML actualizado desde el editor visual.");
  }

  updateCharCounter();
}

function scheduleSyncHtml(options) {
  const immediate = options && options.immediate;
  const silent = options && options.silent;

  if (immediate) {
    clearTimeout(syncTimer);
    flushSyncHtml({ silent: silent });
    return;
  }

  clearTimeout(syncTimer);
  syncTimer = setTimeout(function () {
    flushSyncHtml({ silent: silent });
  }, SYNC_DELAY_MS);
}

function prepareImage(img) {
  if (isLinkedImage(img) || /^https?:\/\//i.test(img.getAttribute("src") || "")) {
    img.dataset.imageMode = "linked";
  } else {
    img.dataset.imageMode = "embedded";
    ensureImageRecord(img);
  }

  img.contentEditable = "false";
  img.draggable = false;

  if (!img.getAttribute("alt")) {
    img.setAttribute("alt", "Imagen");
  }

  if (!img.style.display) {
    img.style.display = "block";
  }

  if (!img.style.margin) {
    img.style.margin = "12px 0";
  }

  if (!img.style.height) {
    img.style.height = "auto";
  }
}

function prepareAllImages() {
  visualEditor.querySelectorAll("img").forEach(prepareImage);
}

function getImageWidthParts(img) {
  const widthStyle = img.style.width;

  if (widthStyle.endsWith("%")) {
    return {
      value: parseFloat(widthStyle) || 100,
      unit: "%",
    };
  }

  const renderedWidth = Math.round(img.getBoundingClientRect().width);

  if (widthStyle.endsWith("px")) {
    return {
      value: parseFloat(widthStyle) || renderedWidth,
      unit: "px",
    };
  }

  return {
    value: renderedWidth || img.naturalWidth || 300,
    unit: "px",
  };
}

function updateImageTools() {
  if (!selectedImage) {
    imageTools.hidden = true;
    return;
  }

  const parts = getImageWidthParts(selectedImage);
  imageWidthInput.value = Math.round(parts.value);
  imageWidthUnit.value = parts.unit;
  imageToolsLabel.textContent = isLinkedImage(selectedImage) ? "Img. enlazada" : "Img. embebida";
  imageTools.hidden = false;
}

function positionImageOverlay() {
  if (!selectedImage) {
    imageResizeOverlay.hidden = true;
    return;
  }

  const containerRect = editorContainer.getBoundingClientRect();
  const imageRect = selectedImage.getBoundingClientRect();

  imageResizeOverlay.hidden = false;
  imageResizeOverlay.style.left = imageRect.left - containerRect.left + "px";
  imageResizeOverlay.style.top = imageRect.top - containerRect.top + "px";
  imageResizeOverlay.style.width = imageRect.width + "px";
  imageResizeOverlay.style.height = imageRect.height + "px";
}

function selectImage(img) {
  if (!img || img.tagName !== "IMG") {
    return;
  }

  prepareImage(img);
  selectedImage = img;
  updateImageTools();
  positionImageOverlay();
  setStatus(
    isLinkedImage(selectedImage)
      ? "Imagen enlazada seleccionada. Arrastra la esquina o cambia el ancho en la barra."
      : "Imagen embebida seleccionada. Arrastra la esquina o cambia el ancho en la barra."
  );
}

function deselectImage() {
  selectedImage = null;
  imageResizeOverlay.hidden = true;
  imageTools.hidden = true;
}

function applyImageWidth(value, unit) {
  if (!selectedImage) {
    return;
  }

  const numericValue = Math.max(20, Number(value) || 20);
  const widthPx = resolveImageWidthPx(value, unit);

  if (unit === "%") {
    selectedImage.style.width = numericValue + "%";
    selectedImage.style.maxWidth = numericValue + "%";
  } else {
    selectedImage.style.width = widthPx + "px";
    selectedImage.style.maxWidth = "none";
  }

  selectedImage.style.height = "auto";
  positionImageOverlay();

  if (isLinkedImage(selectedImage)) {
    scheduleSyncHtml();
    setStatus("Imagen enlazada redimensionada (" + widthPx + " px de ancho).");
    return;
  }

  finalizeImageResize(selectedImage, widthPx);
}

function isRangeInsideEditor(range) {
  if (!range) {
    return false;
  }

  let node = range.commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  return visualEditor.contains(node);
}

function saveEditorSelection() {
  const selection = window.getSelection();

  if (selection && selection.rangeCount > 0 && isRangeInsideEditor(selection.getRangeAt(0))) {
    savedEditorRange = selection.getRangeAt(0).cloneRange();
    return;
  }

  savedEditorRange = null;
}

function saveImageInsertSelection() {
  const selection = window.getSelection();

  if (selection && selection.rangeCount > 0 && isRangeInsideEditor(selection.getRangeAt(0))) {
    savedImageInsertRange = selection.getRangeAt(0).cloneRange();
    savedEditorRange = savedImageInsertRange.cloneRange();
  }
}

function restoreEditorSelection() {
  if (!savedEditorRange) {
    return;
  }

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedEditorRange);
}

function restoreImageInsertSelection() {
  const selection = window.getSelection();
  const range = savedImageInsertRange || savedEditorRange;

  if (!range) {
    return;
  }

  selection.removeAllRanges();
  selection.addRange(range.cloneRange());
}

function clearImageInsertSelection() {
  savedImageInsertRange = null;
}

function insertImageAtCursor(img) {
  focusEditor();
  restoreImageInsertSelection();

  const selection = window.getSelection();

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);

    if (isRangeInsideEditor(range)) {
      range.deleteContents();
      range.insertNode(img);

      const spacer = document.createTextNode("\u00A0");
      range.setStartAfter(img);
      range.collapse(true);
      range.insertNode(spacer);
      range.setStartAfter(spacer);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      clearImageInsertSelection();
      savedEditorRange = null;
      return;
    }
  }

  visualEditor.appendChild(img);
  clearImageInsertSelection();
  savedEditorRange = null;
}

function computeImageDimensions(width, height) {
  const maxSide = Math.max(width, height);

  if (maxSide <= IMAGE_MAX_DIMENSION) {
    return {
      width: width,
      height: height,
      wasResized: false,
    };
  }

  const scale = IMAGE_MAX_DIMENSION / maxSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    wasResized: true,
  };
}

function dimensionsFromWidth(sourceWidth, sourceHeight, targetWidthPx) {
  const width = Math.max(1, Math.round(targetWidthPx));
  const height = Math.max(1, Math.round(sourceHeight * (width / sourceWidth)));

  return { width: width, height: height };
}

function reencodeImageToWidth(dataUrl, targetWidthPx) {
  return new Promise(function (resolve, reject) {
    const image = new Image();

    image.onload = function () {
      const dimensions = dimensionsFromWidth(
        image.naturalWidth,
        image.naturalHeight,
        targetWidthPx
      );

      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      canvas.getContext("2d").drawImage(image, 0, 0, dimensions.width, dimensions.height);

      const nextDataUrl = canvas.toDataURL("image/jpeg", IMAGE_JPEG_QUALITY);

      resolve({
        dataUrl: nextDataUrl,
        width: dimensions.width,
        height: dimensions.height,
        charLength: nextDataUrl.length,
      });
    };

    image.onerror = reject;
    image.src = dataUrl;
  });
}

function updateImageBase64FromWidth(img, targetWidthPx) {
  const id = img.dataset.imageId;
  const currentDataUrl = id && imageStore.get(id);
  const cappedWidth = Math.min(
    Math.max(20, Math.round(targetWidthPx)),
    IMAGE_MAX_DIMENSION
  );

  if (!currentDataUrl) {
    return Promise.resolve(null);
  }

  return reencodeImageToWidth(currentDataUrl, cappedWidth).then(function (result) {
    revokeBlobUrl(id);
    imageStore.set(id, result.dataUrl);

    const blobUrl = dataUrlToBlobUrl(result.dataUrl);
    blobUrlStore.set(id, blobUrl);
    img.src = blobUrl;
    img.style.width = result.width + "px";
    img.style.height = "auto";
    img.style.maxWidth = "none";

    return result;
  });
}

function resolveImageWidthPx(value, unit) {
  const numericValue = Math.max(20, Number(value) || 20);

  if (unit === "%") {
    return Math.max(20, Math.round((numericValue / 100) * visualEditor.clientWidth));
  }

  return numericValue;
}

function finalizeImageResize(img, widthPx, statusPrefix) {
  if (isLinkedImage(img)) {
    scheduleSyncHtml({ immediate: true });
    setStatus((statusPrefix || "Imagen enlazada redimensionada") + " (" + widthPx + " px de ancho).");
    return Promise.resolve();
  }

  setStatus("Optimizando imagen…");

  return updateImageBase64FromWidth(img, widthPx)
    .then(function (result) {
      if (!result) {
        scheduleSyncHtml({ immediate: true });
        return;
      }

      imageWidthInput.value = result.width;
      imageWidthUnit.value = "px";
      positionImageOverlay();
      scheduleSyncHtml({ immediate: true });
      setStatus(
        (statusPrefix || "Imagen redimensionada") +
          " (" +
          result.width +
          "×" +
          result.height +
          " px, ~" +
          result.charLength.toLocaleString("es-ES") +
          " caracteres)."
      );
    })
    .catch(function () {
      scheduleSyncHtml({ immediate: true });
      setStatus("No se pudo optimizar la imagen.");
    });
}

function formatImageSize(width, height) {
  return width + " × " + height + " px";
}

function formatCharCount(count) {
  if (count >= SHEET_CELL_CHAR_LIMIT) {
    return count.toLocaleString("es-ES") + " caracteres (puede no caber en una celda)";
  }

  return count.toLocaleString("es-ES") + " caracteres";
}

function compressImageFile(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();

    reader.onload = function () {
      const image = new Image();

      image.onload = function () {
        const originalWidth = image.naturalWidth;
        const originalHeight = image.naturalHeight;
        const dimensions = computeImageDimensions(originalWidth, originalHeight);

        const canvas = document.createElement("canvas");
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        canvas.getContext("2d").drawImage(image, 0, 0, dimensions.width, dimensions.height);

        const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_JPEG_QUALITY);

        resolve({
          dataUrl: dataUrl,
          originalWidth: originalWidth,
          originalHeight: originalHeight,
          newWidth: dimensions.width,
          newHeight: dimensions.height,
          wasResized: dimensions.wasResized,
          charLength: dataUrl.length,
        });
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openImageResizeDialog(compressedImage, onConfirm) {
  imageResizeOriginal.textContent = formatImageSize(
    compressedImage.originalWidth,
    compressedImage.originalHeight
  );
  imageResizeFinal.textContent = formatImageSize(
    compressedImage.newWidth,
    compressedImage.newHeight
  );
  imageResizeChars.textContent = formatCharCount(compressedImage.charLength);

  pendingImageInsert = onConfirm;

  if (typeof imageResizeDialog.showModal === "function") {
    imageResizeDialog.showModal();
  } else {
    imageResizeDialog.setAttribute("open", "open");
  }
}

function closeImageResizeDialog() {
  if (typeof imageResizeDialog.close === "function") {
    imageResizeDialog.close();
  } else {
    imageResizeDialog.removeAttribute("open");
  }

  pendingImageInsert = null;
}

function insertCompressedImage(compressedImage) {
  const id = createImageId();
  const blobUrl = dataUrlToBlobUrl(compressedImage.dataUrl);

  imageStore.set(id, compressedImage.dataUrl);
  blobUrlStore.set(id, blobUrl);

  const img = document.createElement("img");
  img.dataset.imageId = id;
  img.dataset.imageMode = "embedded";
  img.src = blobUrl;
  img.alt = "Imagen";
  img.style.display = "block";
  img.style.margin = "12px 0";
  img.style.height = "auto";
  img.style.width = compressedImage.newWidth + "px";

  prepareImage(img);
  insertImageAtCursor(img);
  selectImage(img);
  scheduleSyncHtml({ immediate: true });

  if (compressedImage.wasResized) {
    setStatus(
      "Imagen insertada reducida a " +
        compressedImage.newWidth +
        "×" +
        compressedImage.newHeight +
        " px (~" +
        compressedImage.charLength.toLocaleString("es-ES") +
        " caracteres en base64)."
    );
  } else {
    setStatus("Imagen insertada (~" + compressedImage.charLength.toLocaleString("es-ES") + " caracteres en base64).");
  }
}

function insertImageFromFile(file) {
  compressImageFile(file)
    .then(function (compressedImage) {
      if (compressedImage.wasResized) {
        openImageResizeDialog(compressedImage, function () {
          insertCompressedImage(compressedImage);
        });
        return;
      }

      insertCompressedImage(compressedImage);
    })
    .catch(function (err) {
      setStatus("No se pudo procesar la imagen seleccionada: " + (err && err.message ? err.message : ""));
    })
    .finally(function () {
      embeddedImageInput.value = "";
    });
}

function hasLinkedImageModalUi() {
  return Boolean(
    linkedImageModal &&
    linkedImageBackdrop &&
    linkedImageUrlInput &&
    linkedImageError &&
    confirmLinkedImageButton &&
    cancelLinkedImageButton &&
    closeLinkedImageDialogButton
  );
}

function openLinkedImageDialog(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  saveEditorSelection();

  if (!hasLinkedImageModalUi()) {
    setStatus("No se pudo abrir el popup de imagen enlazada. Recarga la página con Ctrl+F5.");
    return;
  }

  linkedImageUrlInput.value = "https://";
  linkedImageError.textContent = "";
  linkedImageError.hidden = true;
  confirmLinkedImageButton.disabled = false;
  confirmLinkedImageButton.textContent = "Insertar imagen";
  linkedImageModal.hidden = false;
  linkedImageModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  window.setTimeout(function () {
    linkedImageUrlInput.focus();
    linkedImageUrlInput.select();
  }, 0);
}

function closeLinkedImageDialog() {
  if (!linkedImageModal) {
    return;
  }

  linkedImageModal.hidden = true;
  linkedImageModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function showLinkedImageError(message) {
  linkedImageError.textContent = message;
  linkedImageError.hidden = false;
}

function insertLinkedImageElement(trimmedUrl) {
  const img = document.createElement("img");
  img.dataset.imageMode = "linked";
  img.alt = "Imagen";
  img.style.display = "block";
  img.style.margin = "12px 0";
  img.style.height = "auto";
  img.style.maxWidth = "100%";

  img.onload = function () {
    const maxWidth = Math.max(200, visualEditor.clientWidth - 40);
    const initialWidth = Math.min(img.naturalWidth || maxWidth, maxWidth);
    img.style.width = initialWidth + "px";
    prepareImage(img);
    insertImageAtCursor(img);
    selectImage(img);
    scheduleSyncHtml({ immediate: true });
    closeLinkedImageDialog();
    confirmLinkedImageButton.disabled = false;
    confirmLinkedImageButton.textContent = "Insertar imagen";
    setStatus("Imagen enlazada insertada. El HTML solo guarda la URL.");
  };

  img.onerror = function () {
    confirmLinkedImageButton.disabled = false;
    confirmLinkedImageButton.textContent = "Insertar imagen";
    showLinkedImageError("No se pudo cargar la imagen desde esa URL. Comprueba que sea pública.");
  };

  img.src = trimmedUrl;
}

function confirmLinkedImageInsert() {
  const trimmedUrl = linkedImageUrlInput.value.trim();

  if (!trimmedUrl) {
    showLinkedImageError("Introduce la URL de la imagen.");
    return;
  }

  if (!/^https?:\/\//i.test(trimmedUrl)) {
    showLinkedImageError("La URL debe empezar por http:// o https://");
    return;
  }

  linkedImageError.hidden = true;
  confirmLinkedImageButton.disabled = true;
  confirmLinkedImageButton.textContent = "Cargando…";
  insertLinkedImageElement(trimmedUrl);
}

function bindLinkedImageDialog() {
  if (!linkedImageButton) {
    return;
  }

  linkedImageButton.addEventListener("click", openLinkedImageDialog);

  if (!hasLinkedImageModalUi()) {
    return;
  }

  confirmLinkedImageButton.addEventListener("click", function (event) {
    event.preventDefault();
    confirmLinkedImageInsert();
  });

  cancelLinkedImageButton.addEventListener("click", function (event) {
    event.preventDefault();
    closeLinkedImageDialog();
  });

  closeLinkedImageDialogButton.addEventListener("click", function (event) {
    event.preventDefault();
    closeLinkedImageDialog();
  });

  linkedImageBackdrop.addEventListener("click", function (event) {
    event.preventDefault();
    closeLinkedImageDialog();
  });

  linkedImageUrlInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmLinkedImageInsert();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeLinkedImageDialog();
    }
  });
}

function bindImageResizeDialog() {
  confirmImageInsertButton.addEventListener("click", function (event) {
    event.preventDefault();

    const action = pendingImageInsert;
    closeImageResizeDialog();

    if (action) {
      action();
    }
  });

  cancelImageInsertButton.addEventListener("click", function (event) {
    event.preventDefault();
    closeImageResizeDialog();
    clearImageInsertSelection();
  });

  closeImageResizeDialogButton.addEventListener("click", function (event) {
    event.preventDefault();
    closeImageResizeDialog();
    clearImageInsertSelection();
  });
}

function bindImageInteractions() {
  visualEditor.addEventListener("click", function (event) {
    if (event.target.tagName === "IMG") {
      event.preventDefault();
      selectImage(event.target);
      return;
    }

    if (!imageResizeOverlay.contains(event.target)) {
      deselectImage();
    }
  });

  visualEditor.addEventListener("scroll", positionImageOverlay, { passive: true });
  window.addEventListener("resize", positionImageOverlay, { passive: true });

  imageWidthInput.addEventListener("change", function () {
    applyImageWidth(imageWidthInput.value, imageWidthUnit.value);
  });

  imageWidthUnit.addEventListener("change", function () {
    applyImageWidth(imageWidthInput.value, imageWidthUnit.value);
  });

  resizeHandle.addEventListener("mousedown", function (event) {
    if (!selectedImage) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    isResizingImage = true;
    const startX = event.clientX;
    const startWidth = selectedImage.getBoundingClientRect().width;
    const imageToResize = selectedImage;

    function onMouseMove(moveEvent) {
      const nextWidth = Math.max(20, Math.round(startWidth + (moveEvent.clientX - startX)));
      imageToResize.style.width = nextWidth + "px";
      imageToResize.style.height = "auto";
      imageToResize.style.maxWidth = "none";
      imageWidthInput.value = nextWidth;
      imageWidthUnit.value = "px";
      positionImageOverlay();
    }

    function onMouseUp() {
      isResizingImage = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      const finalWidth = Math.max(20, Math.round(imageToResize.getBoundingClientRect().width));

      if (Math.abs(finalWidth - startWidth) < 2) {
        scheduleSyncHtml({ immediate: true });
        setStatus("Imagen sin cambios.");
        return;
      }

      if (isLinkedImage(imageToResize)) {
        scheduleSyncHtml({ immediate: true });
        setStatus("Imagen enlazada redimensionada (" + finalWidth + " px de ancho).");
        return;
      }

      finalizeImageResize(imageToResize, finalWidth);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function syncVisualFromHtml() {
  syncingFromHtml = true;

  const expandedHtml = expandImagePlaceholders(htmlOutput.value.trim());
  visualEditor.innerHTML = expandedHtml;

  prepareAllImages();
  visualEditor.querySelectorAll("img").forEach(function (img) {
    ensureImageRecord(img);
  });

  syncingFromHtml = false;
  deselectImage();
  scheduleSyncHtml({ immediate: true, silent: true });
  setStatus("Cambios HTML aplicados al editor visual.");
}

function insertTemplateVariable(token) {
  focusEditor();
  restoreEditorSelection();

  if (document.queryCommandSupported && document.queryCommandSupported("insertText")) {
    document.execCommand("insertText", false, token);
  } else {
    exec("insertHTML", token.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    return;
  }

  saveEditorSelection();
  scheduleSyncHtml({ immediate: true });
  setStatus("Variable insertada: " + token);
}

function bindVariableButtons() {
  document.querySelectorAll("[data-variable]").forEach(function (button) {
    button.addEventListener("mousedown", saveEditorSelection);

    button.addEventListener("click", function (event) {
      event.preventDefault();
      insertTemplateVariable(button.dataset.variable);
    });
  });
}

function bindToolbar() {
  document.querySelectorAll("[data-command]").forEach(function (button) {
    button.addEventListener("click", function () {
      exec(button.dataset.command, button.dataset.value || null);
    });
  });

  fontFamilySelect.addEventListener("change", function () {
    if (!fontFamilySelect.value) {
      return;
    }

    wrapSelectionWithStyle("font-family: " + fontFamilySelect.value);
    fontFamilySelect.value = "";
  });

  fontSizeSelect.addEventListener("change", function () {
    if (!fontSizeSelect.value) {
      return;
    }

    wrapSelectionWithStyle("font-size: " + fontSizeSelect.value);
    fontSizeSelect.value = "";
  });

  textColorInput.addEventListener("input", function () {
    exec("foreColor", textColorInput.value);
  });

  backgroundColorInput.addEventListener("input", function () {
    exec("hiliteColor", backgroundColorInput.value);
  });

  document.getElementById("linkButton").addEventListener("click", function () {
    const url = window.prompt("URL del enlace:", "https://");

    if (url) {
      exec("createLink", url);
    }
  });

  embeddedImageInput.addEventListener("mousedown", saveImageInsertSelection);

  const embeddedImageLabel = embeddedImageInput.closest(".file-button");

  if (embeddedImageLabel) {
    embeddedImageLabel.addEventListener("mousedown", saveImageInsertSelection);
  }

  embeddedImageInput.addEventListener("change", function (event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("Solo se pueden insertar archivos de imagen.");
      embeddedImageInput.value = "";
      return;
    }

    insertImageFromFile(file);
  });

  linkedImageButton.addEventListener("mousedown", saveEditorSelection);

  copyHtmlButton.addEventListener("click", async function () {
    const exportHtml = buildExportHtml();

    try {
      await navigator.clipboard.writeText(exportHtml);
      htmlOutput.value = exportHtml;
      setStatus("HTML completo copiado al portapapeles.");
    } catch (err) {
      htmlOutput.value = exportHtml;
      htmlOutput.focus();
      htmlOutput.select();
      document.execCommand("copy");
      setStatus("HTML completo copiado al portapapeles.");
    }

    updateCharCounter();
  });

  applyHtmlButton.addEventListener("click", function () {
    syncVisualFromHtml();
  });
}

visualEditor.addEventListener("input", function () {
  saveEditorSelection();

  if (selectedImage && !visualEditor.contains(selectedImage)) {
    deselectImage();
  }

  scheduleSyncHtml({ silent: true });
});

visualEditor.addEventListener("mouseup", saveEditorSelection);
visualEditor.addEventListener("keyup", saveEditorSelection);

visualEditor.addEventListener("blur", function () {
  scheduleSyncHtml({ immediate: true });
});

htmlOutput.addEventListener("input", function () {
  setStatus("HTML editado manualmente. Pulsa «Aplicar al editor» para previsualizarlo.");
  updateCharCounter();
});

htmlOutput.addEventListener("focus", updateCharCounter);
htmlOutput.addEventListener("blur", updateCharCounter);

bindToolbar();
bindVariableButtons();
bindImageInteractions();
bindImageResizeDialog();
bindLinkedImageDialog();
scheduleSyncHtml({ immediate: true });
updateCharCounter();
setStatus("Listo. Img. embebida (base64) o Img. enlazada (URL). Ambas se pueden redimensionar.");
