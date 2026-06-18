document.addEventListener("DOMContentLoaded", () => {
  const products = ProductStorage.getProducts().filter((p) => !!p.markerId);
  const scene = document.querySelector("#arScene");
  const markerCountEl = document.getElementById("markerCount");
  const noMarkerState = document.getElementById("noMarkerState");

  if (products.length === 0) {
    noMarkerState.hidden = false;
    return;
  }

  const visibleMarkers = new Set();
  let registeredCount = 0;

  products.forEach((product) => {
    const numericValue = extractBarcodeValue(product.markerId);

    if (numericValue === null || numericValue > 63) {
      console.warn(
        `Marker ${product.markerId} di luar rentang barcode 3x3 (0-63). Lewati atau pakai matrixCodeType 4x4.`,
      );
      return;
    }

    const result = ExpiryEngine.calculateStatus(product);
    const visual = statusToVisual(result.status);

    const markerEl = document.createElement("a-marker");
    markerEl.setAttribute("type", "barcode");
    markerEl.setAttribute("value", String(numericValue));
    markerEl.setAttribute("id", `marker-${product.id}`);
    markerEl.setAttribute("emitevents", "true");

    const objectEl = document.createElement("a-entity");
    objectEl.setAttribute("geometry", `primitive: ${visual.primitive}`);
    objectEl.setAttribute(
      "material",
      `color: ${visual.color}; shader: standard; metalness: 0.1; roughness: 0.6;`,
    );
    objectEl.setAttribute("position", "0 0.6 0");
    objectEl.setAttribute("scale", "0.4 0.4 0.4");
    objectEl.setAttribute(
      "animation",
      "property: rotation; to: 0 360 0; loop: true; dur: 6000; easing: linear;",
    );

    const labelEl = document.createElement("a-text");
    labelEl.setAttribute("value", `${product.namaProduk}\n${result.label}`);
    labelEl.setAttribute("align", "center");
    labelEl.setAttribute("position", "0 1.2 0");
    labelEl.setAttribute("scale", "0.6 0.6 0.6");
    labelEl.setAttribute("color", visual.color);

    markerEl.appendChild(objectEl);
    markerEl.appendChild(labelEl);
    scene.appendChild(markerEl);

    markerEl.addEventListener("markerFound", () => {
      visibleMarkers.add(product.id);
      updateInfoPanel(product, result);
    });
    markerEl.addEventListener("markerLost", () => {
      visibleMarkers.delete(product.id);
      if (visibleMarkers.size === 0) {
        document.getElementById("infoPanel").hidden = true;
      }
    });

    registeredCount++;
  });

  markerCountEl.textContent = `${registeredCount} MARKER AKTIF`;
  if (registeredCount === 0) noMarkerState.hidden = false;
});

function extractBarcodeValue(markerId) {
  const digits = markerId.replace(/\D/g, "");
  if (!digits) return null;
  return parseInt(digits, 10);
}

function statusToVisual(status) {
  const map = {
    FRESH: {primitive: "box", color: "#39ff14"},
    CONSUME_SOON: {primitive: "cylinder", color: "#ffd400"},
    CRITICAL: {primitive: "cone", color: "#ff8c00"},
    EXPIRED: {primitive: "sphere", color: "#ff3b30"},
  };
  return map[status] || map.FRESH;
}

function updateInfoPanel(product, result) {
  const panel = document.getElementById("infoPanel");
  document.getElementById("infoNama").textContent = product.namaProduk;
  const statusEl = document.getElementById("infoStatus");
  statusEl.textContent = result.label;
  statusEl.className = `badge badge-${result.status.toLowerCase()}`;
  document.getElementById("infoSisa").textContent = `${result.sisaHari} HARI`;
  panel.hidden = false;
}
