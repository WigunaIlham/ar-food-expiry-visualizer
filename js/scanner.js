/**
 * scanner.js — AR Scanner controller
 * Compatible dengan A-Frame 1.4.2 + AR.js 2.2.2
 */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────
  const COLOR = {
    fresh: "#22c55e",
    "consume-soon": "#eab308",
    critical: "#f97316",
    expired: "#ef4444",
  };

  const GEOMETRY = {
    fresh: {tag: "a-box", extra: {width: "0.6", height: "0.6", depth: "0.6"}},
    "consume-soon": {
      tag: "a-cylinder",
      extra: {radius: "0.32", height: "0.65"},
    },
    critical: {
      tag: "a-cone",
      extra: {"radius-bottom": "0.38", "radius-top": "0", height: "0.72"},
    },
    expired: {tag: "a-sphere", extra: {radius: "0.35"}},
  };

  const EMOJI = {
    fresh: "✅",
    "consume-soon": "⚠️",
    critical: "🚨",
    expired: "💀",
  };

  // ── State ────────────────────────────────────────────────────────
  let selectedProduct = null;
  let selectedInfo = null;
  let markerVisible = false;

  // ── DOM helpers ──────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const el = (tag) => document.createElement(tag);

  // ── Wait for A-Frame to be ready ────────────────────────────────
  function waitForAFrame(cb) {
    const scene = $("ar-marker") ? document.querySelector("a-scene") : null;
    if (!scene) {
      // A-Frame not yet parsed — wait
      setTimeout(() => waitForAFrame(cb), 100);
      return;
    }
    if (scene.hasLoaded) {
      cb();
    } else {
      scene.addEventListener("loaded", cb, {once: true});
    }
  }

  // ── Bootstrap ────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    populateSelector();
    bindUI();

    // Wait for A-Frame scene + AR.js marker element before binding AR events
    waitForAFrame(bindAREvents);
  });

  // ── Populate product dropdown ────────────────────────────────────
  function populateSelector() {
    const sel = $("select-product");
    const products = Storage.getAll();

    // Reset
    sel.innerHTML = '<option value="">— Pilih produk untuk di-scan —</option>';

    if (products.length === 0) {
      sel.innerHTML +=
        '<option value="" disabled>Belum ada produk. Tambah di Dashboard.</option>';
      return;
    }

    products.forEach(function (p) {
      const info = Expiry.calculate(p);
      const opt = el("option");
      opt.value = p.markerId;
      opt.textContent = `${info.emoji} ${p.namaProduk} (${p.markerId})`;
      sel.appendChild(opt);
    });
  }

  // ── UI Events ────────────────────────────────────────────────────
  function bindUI() {
    $("select-product").addEventListener("change", function () {
      const id = this.value;

      if (!id) {
        selectedProduct = null;
        selectedInfo = null;
        clearAR();
        setState("idle");
        $("status-panel").classList.remove("active");
        return;
      }

      selectedProduct = Storage.getById(id);
      if (!selectedProduct) {
        toast("Data produk tidak ditemukan", "err");
        return;
      }
      selectedInfo = Expiry.calculate(selectedProduct);
      setState("scanning");
      toast(`Siap scan ${id} — arahkan ke Hiro marker`, "ok");
    });

    $("btn-refresh").addEventListener("click", function () {
      populateSelector();
      toast("Daftar diperbarui", "ok");
    });
  }

  // ── AR Events ────────────────────────────────────────────────────
  function bindAREvents() {
    const marker = document.getElementById("ar-marker");

    if (!marker) {
      console.warn("[Scanner] ar-marker element not found");
      return;
    }

    marker.addEventListener("markerFound", function () {
      markerVisible = true;

      if (!selectedProduct) {
        toast("Pilih produk dulu dari dropdown", "warn");
        setState("scanning");
        return;
      }

      setState("detected");
      renderAR(selectedProduct, selectedInfo);
      renderPanel(selectedProduct, selectedInfo);
      $("status-panel").classList.add("active");
    });

    marker.addEventListener("markerLost", function () {
      markerVisible = false;

      $("status-panel").classList.remove("active");

      if (selectedProduct) {
        setState("scanning");
      } else {
        setState("idle");
      }
    });
  }

  // ── Render AR Objects ────────────────────────────────────────────
  function renderAR(product, info) {
    clearAR();

    const root = $("ar-root");
    const color = COLOR[info.status] || "#ffffff";
    const geom = GEOMETRY[info.status] || GEOMETRY["fresh"];

    // ── 3D Shape ──
    const shape = document.createElement(geom.tag);

    // Geometry attributes
    Object.entries(geom.extra).forEach(function ([k, v]) {
      shape.setAttribute(k, v);
    });

    // Position: center above marker
    shape.setAttribute("position", "0 0.42 0");

    // Material with emissive glow
    shape.setAttribute(
      "material",
      "color: " +
        color +
        "; " +
        "emissive: " +
        color +
        "; " +
        "emissiveIntensity: 0.25; " +
        "opacity: 0.92; " +
        "transparent: true",
    );

    // Rotation animation
    shape.setAttribute(
      "animation",
      "property: rotation; " +
        "to: 0 360 0; " +
        "loop: true; " +
        "dur: 3000; " +
        "easing: linear",
    );

    shape.setAttribute("id", "ar-shape");
    root.appendChild(shape);

    // ── Text: Product Name ──
    var tName = document.createElement("a-text");
    tName.setAttribute("value", product.namaProduk);
    tName.setAttribute("color", "#ffffff");
    tName.setAttribute("align", "center");
    tName.setAttribute("width", "2.4");
    tName.setAttribute("position", "0 1.05 0");
    tName.setAttribute("look-at", "[camera]");
    tName.setAttribute("id", "ar-text-name");
    root.appendChild(tName);

    // ── Text: Status ──
    var tStatus = document.createElement("a-text");
    tStatus.setAttribute("value", "● " + info.label.toUpperCase());
    tStatus.setAttribute("color", color);
    tStatus.setAttribute("align", "center");
    tStatus.setAttribute("width", "2.1");
    tStatus.setAttribute("position", "0 0.84 0");
    tStatus.setAttribute("look-at", "[camera]");
    tStatus.setAttribute("id", "ar-text-status");
    root.appendChild(tStatus);

    // ── Text: Days remaining ──
    var sisaText =
      info.sisaHari > 0 ? "Sisa " + info.sisaHari + " hari" : "⚠ KADALUARSA";
    var tSisa = document.createElement("a-text");
    tSisa.setAttribute("value", sisaText);
    tSisa.setAttribute("color", info.sisaHari > 0 ? "#94a3b8" : "#ef4444");
    tSisa.setAttribute("align", "center");
    tSisa.setAttribute("width", "1.9");
    tSisa.setAttribute("position", "0 0.67 0");
    tSisa.setAttribute("look-at", "[camera]");
    tSisa.setAttribute("id", "ar-text-sisa");
    root.appendChild(tSisa);
  }

  // ── Clear all AR children ────────────────────────────────────────
  function clearAR() {
    var root = $("ar-root");
    if (!root) return;
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
  }

  // ── Render bottom status panel ───────────────────────────────────
  function renderPanel(product, info) {
    $("panel-name").textContent = product.namaProduk;

    var statusEl = $("panel-status-val");
    statusEl.textContent = EMOJI[info.status] + " " + info.label;
    statusEl.className = "col-" + info.status;

    $("panel-sisa").textContent =
      info.sisaHari > 0 ? info.sisaHari + "h" : "Exp";
    $("panel-umur").textContent = info.umurProduk + "h";
    $("panel-persen").textContent = info.persentase + "%";

    var bar = $("panel-bar");
    bar.style.width = Math.min(100, info.barWidth) + "%";
    bar.className = "bar-" + info.status;
  }

  // ── Overlay state machine ────────────────────────────────────────
  function setState(state) {
    ["idle", "scanning", "detected"].forEach(function (s) {
      var el = $("state-" + s);
      if (el) el.classList.toggle("active", s === state);
    });
  }

  // ── Toast ────────────────────────────────────────────────────────
  function toast(msg, type) {
    var t = el("div");
    t.className = "toast " + (type || "ok");
    t.textContent = msg;
    $("toast-wrap").appendChild(t);
    setTimeout(function () {
      t.remove();
    }, 3000);
  }
})();
