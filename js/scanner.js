/**
 * scanner.js
 * AR Scanner controller.
 *
 * Flow:
 * 1. User memilih produk yang ingin di-scan dari dropdown.
 * 2. User arahkan kamera ke Hiro marker.
 * 3. AR.js mendeteksi marker.
 * 4. Scanner mengambil data produk dari Storage.
 * 5. Menghitung status kesegaran via Expiry.
 * 6. Merender objek 3D + teks info di atas marker.
 */

const Scanner = (() => {
  // ─── Config ────────────────────────────────────────────────────
  const STATUS_COLORS = {
    fresh: "#22c55e",
    "consume-soon": "#eab308",
    critical: "#f97316",
    expired: "#ef4444",
  };

  // AR Object geometry per status
  const STATUS_GEOMETRY = {
    fresh: {primitive: "box", attrs: "width:0.6; height:0.6; depth:0.6;"},
    "consume-soon": {primitive: "cylinder", attrs: "radius:0.35; height:0.7;"},
    critical: {
      primitive: "cone",
      attrs: "radiusBottom:0.4; radiusTop:0; height:0.75;",
    },
    expired: {primitive: "sphere", attrs: "radius:0.38;"},
  };

  // ─── State ─────────────────────────────────────────────────────
  let currentProduct = null;
  let currentInfo = null;
  let isMarkerVisible = false;
  let animFrame = null;

  // ─── DOM Refs (set on init) ─────────────────────────────────────
  let arScene, markerEl, arObject, arTextTop, arTextMid, arTextBot;
  let selectProduct, btnRefresh, statusPanel;
  let panelName, panelStatus, panelSisa, panelUmur, panelPersen;
  let overlayIdle, overlayScanning, overlayDetected;
  let toastContainer;

  // ─── Init ──────────────────────────────────────────────────────
  function init() {
    // DOM bindings
    arScene = document.getElementById("arScene");
    markerEl = document.getElementById("arMarker");
    arObject = document.getElementById("arObject");
    arTextTop = document.getElementById("arTextTop");
    arTextMid = document.getElementById("arTextMid");
    arTextBot = document.getElementById("arTextBot");
    selectProduct = document.getElementById("selectProduct");
    btnRefresh = document.getElementById("btnRefreshProducts");
    statusPanel = document.getElementById("statusPanel");
    panelName = document.getElementById("panelName");
    panelStatus = document.getElementById("panelStatus");
    panelSisa = document.getElementById("panelSisa");
    panelUmur = document.getElementById("panelUmur");
    panelPersen = document.getElementById("panelPersen");
    overlayIdle = document.getElementById("overlayIdle");
    overlayScanning = document.getElementById("overlayScanning");
    overlayDetected = document.getElementById("overlayDetected");
    toastContainer = document.getElementById("toastContainer");

    populateProductSelector();
    bindEvents();
    setOverlay("idle");
  }

  // ─── Product Selector ──────────────────────────────────────────
  function populateProductSelector() {
    const products = Storage.getAll();
    selectProduct.innerHTML =
      '<option value="">— Pilih produk untuk di-scan —</option>';

    if (products.length === 0) {
      selectProduct.innerHTML +=
        "<option disabled>Belum ada produk. Tambah di Dashboard.</option>";
      return;
    }

    products.forEach((p) => {
      const info = Expiry.calculate(p);
      const option = document.createElement("option");
      option.value = p.markerId;
      option.textContent = `${info.emoji} ${p.namaProduk} (${p.markerId})`;
      selectProduct.appendChild(option);
    });
  }

  // ─── Events ────────────────────────────────────────────────────
  function bindEvents() {
    // Product selection change
    selectProduct.addEventListener("change", () => {
      const id = selectProduct.value;
      if (!id) {
        currentProduct = null;
        currentInfo = null;
        clearARObjects();
        setOverlay("idle");
        statusPanel.classList.remove("active");
        return;
      }
      currentProduct = Storage.getById(id);
      if (!currentProduct) {
        showToast("Data produk tidak ditemukan", "error");
        return;
      }
      currentInfo = Expiry.calculate(currentProduct);
      setOverlay("scanning");
      showToast(`Arahkan ke marker ${id}`, "success");
    });

    // Refresh product list
    btnRefresh.addEventListener("click", () => {
      populateProductSelector();
      showToast("Daftar produk diperbarui", "success");
    });

    // AR.js marker found
    markerEl.addEventListener("markerFound", onMarkerFound);

    // AR.js marker lost
    markerEl.addEventListener("markerLost", onMarkerLost);
  }

  // ─── Marker Found ──────────────────────────────────────────────
  function onMarkerFound() {
    isMarkerVisible = true;

    if (!currentProduct || !currentInfo) {
      // Marker detected but no product selected
      setOverlay("scanning");
      showToast("Pilih produk terlebih dahulu", "warning");
      return;
    }

    setOverlay("detected");
    renderARObjects(currentProduct, currentInfo);
    renderStatusPanel(currentProduct, currentInfo);
    statusPanel.classList.add("active");

    // Start pulse animation loop
    startPulseAnimation();
  }

  // ─── Marker Lost ───────────────────────────────────────────────
  function onMarkerLost() {
    isMarkerVisible = false;
    stopPulseAnimation();

    if (currentProduct) {
      setOverlay("scanning");
      statusPanel.classList.remove("active");
    } else {
      setOverlay("idle");
    }
  }

  // ─── Render 3D Objects ─────────────────────────────────────────
  function renderARObjects(product, info) {
    const color = STATUS_COLORS[info.status] || "#ffffff";
    const geom = STATUS_GEOMETRY[info.status] || STATUS_GEOMETRY["fresh"];

    // Remove existing object and rebuild with correct geometry
    const existing = document.getElementById("arObject");
    if (existing) existing.remove();

    const entity = document.createElement("a-entity");
    entity.id = "arObject";

    // Main 3D shape
    const shape = document.createElement("a-" + geom.primitive);

    // Parse and set geometry attrs
    geom.attrs.split(";").forEach((attr) => {
      const [key, val] = attr.split(":");
      if (key && val) shape.setAttribute(key.trim(), val.trim());
    });

    shape.setAttribute("color", color);
    shape.setAttribute("opacity", "0.92");
    shape.setAttribute("position", "0 0.4 0");
    shape.setAttribute(
      "animation",
      `
      property: rotation;
      to: 0 360 0;
      loop: true;
      dur: 3000;
      easing: linear
    `,
    );

    // Emission glow
    shape.setAttribute(
      "material",
      `
      color: ${color};
      emissive: ${color};
      emissiveIntensity: 0.3;
      opacity: 0.92;
      transparent: true
    `,
    );

    entity.appendChild(shape);
    markerEl.appendChild(entity);

    // Top text: Product name
    arTextTop.setAttribute("value", product.namaProduk);
    arTextTop.setAttribute("color", "#ffffff");
    arTextTop.setAttribute("position", "0 1.1 0");
    arTextTop.setAttribute("align", "center");
    arTextTop.setAttribute("width", "2.5");

    // Mid text: Status label
    arTextMid.setAttribute("value", `● ${info.label.toUpperCase()}`);
    arTextMid.setAttribute("color", color);
    arTextMid.setAttribute("position", "0 0.88 0");
    arTextMid.setAttribute("align", "center");
    arTextMid.setAttribute("width", "2.2");

    // Bottom text: Remaining days
    const sisaText =
      info.sisaHari > 0 ? `Sisa ${info.sisaHari} hari` : "KADALUARSA";
    arTextBot.setAttribute("value", sisaText);
    arTextBot.setAttribute("color", info.sisaHari > 0 ? "#cbd5e1" : "#ef4444");
    arTextBot.setAttribute("position", "0 0.7 0");
    arTextBot.setAttribute("align", "center");
    arTextBot.setAttribute("width", "2.0");
  }

  // ─── Clear 3D Objects ─────────────────────────────────────────
  function clearARObjects() {
    const obj = document.getElementById("arObject");
    if (obj) obj.remove();
    ["arTextTop", "arTextMid", "arTextBot"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute("value", "");
    });
  }

  // ─── Status Panel ─────────────────────────────────────────────
  function renderStatusPanel(product, info) {
    panelName.textContent = product.namaProduk;

    panelStatus.textContent = `${info.emoji} ${info.label}`;
    panelStatus.className = `panel-status-value status-${info.status}`;

    panelSisa.textContent =
      info.sisaHari > 0 ? `${info.sisaHari} hari` : "Kadaluarsa";
    panelUmur.textContent = `${info.umurProduk} hari`;
    panelPersen.textContent = `${info.persentase}%`;

    // Update freshness bar
    const bar = document.getElementById("panelBar");
    if (bar) {
      bar.style.width = `${Math.min(100, info.barWidth)}%`;
      bar.className = `freshness-bar-fill ${info.status}`;
    }
  }

  // ─── Overlay State ────────────────────────────────────────────
  function setOverlay(state) {
    overlayIdle.style.display = state === "idle" ? "flex" : "none";
    overlayScanning.style.display = state === "scanning" ? "flex" : "none";
    overlayDetected.style.display = state === "detected" ? "flex" : "none";
  }

  // ─── Pulse Animation ──────────────────────────────────────────
  function startPulseAnimation() {
    stopPulseAnimation();
    let t = 0;
    function tick() {
      t += 0.04;
      const obj = document.getElementById("arObject");
      if (obj && isMarkerVisible) {
        const scale = 1 + 0.05 * Math.sin(t);
        const child = obj.querySelector(
          "a-" + (STATUS_GEOMETRY[currentInfo?.status]?.primitive || "box"),
        );
        if (child) child.setAttribute("scale", `${scale} ${scale} ${scale}`);
      }
      animFrame = requestAnimationFrame(tick);
    }
    animFrame = requestAnimationFrame(tick);
  }

  function stopPulseAnimation() {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
  }

  // ─── Toast ────────────────────────────────────────────────────
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ─── Public API ───────────────────────────────────────────────
  return {init};
})();

// Boot after DOM ready
document.addEventListener("DOMContentLoaded", Scanner.init);
