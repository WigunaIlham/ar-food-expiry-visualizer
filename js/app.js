/**
 * app.js
 * Dashboard controller — handles all UI logic for index.html.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ─── DOM References ───────────────────────────────────────────
  const productListEl = document.getElementById("productList");
  const statFresh = document.getElementById("statFresh");
  const statSoon = document.getElementById("statSoon");
  const statCritical = document.getElementById("statCritical");
  const statExpired = document.getElementById("statExpired");

  // Modal
  const deleteModal = document.getElementById("deleteModal");
  const deleteModalName = document.getElementById("deleteModalName");
  const btnConfirmDel = document.getElementById("btnConfirmDelete");
  const btnCancelDel = document.getElementById("btnCancelDelete");

  // Marker Modal
  const markerModal = document.getElementById("markerModal");
  const markerCanvas = document.getElementById("markerCanvas");
  const markerIdDisplay = document.getElementById("markerIdDisplay");
  const markerNameDisp = document.getElementById("markerNameDisplay");
  const btnDownMarker = document.getElementById("btnDownloadMarker");
  const btnCloseMarker = document.getElementById("btnCloseMarker");

  // Toast container
  const toastContainer = document.getElementById("toastContainer");

  // ─── State ────────────────────────────────────────────────────
  let pendingDeleteId = null;
  let activeMarkerCanvas = null;
  let activeMarkerId = null;

  // ─── Init ─────────────────────────────────────────────────────
  renderDashboard();

  // ─── Render ───────────────────────────────────────────────────

  function renderDashboard() {
    const products = Storage.getAll();
    renderStats(products);
    renderProductList(products);
  }

  function renderStats(products) {
    const counts = {fresh: 0, "consume-soon": 0, critical: 0, expired: 0};
    products.forEach((p) => {
      const {status} = Expiry.calculate(p);
      if (counts[status] !== undefined) counts[status]++;
    });
    statFresh.textContent = counts["fresh"];
    statSoon.textContent = counts["consume-soon"];
    statCritical.textContent = counts["critical"];
    statExpired.textContent = counts["expired"];
  }

  function renderProductList(products) {
    if (products.length === 0) {
      productListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧺</div>
          <h3>Belum ada produk</h3>
          <p>Tambah produk pertama Anda dengan menekan tombol "+ Tambah Produk"</p>
        </div>`;
      return;
    }

    productListEl.innerHTML = products.map((p) => buildProductCard(p)).join("");

    // Attach event listeners
    document.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", handleCardAction);
    });
  }

  function buildProductCard(product) {
    const info = Expiry.calculate(product);
    const statusClass = info.status;

    return `
      <div class="product-card" data-id="${product.markerId}">
        <div class="product-card-header">
          <div class="status-indicator ${statusClass}">
            ${info.emoji}
          </div>
          <div class="product-info">
            <div class="product-name">${escapeHtml(product.namaProduk)}</div>
            <div class="product-meta">${product.markerId} · Dibeli ${formatDate(product.tanggalPembelian)}</div>
          </div>
          <span class="status-badge ${statusClass}">${info.label}</span>
        </div>
        <div class="product-card-body">
          <div class="product-detail-row">
            <span class="detail-label">Masa Simpan</span>
            <span class="detail-value">${product.masaSimpan} hari</span>
          </div>
          <div class="product-detail-row">
            <span class="detail-label">Umur Produk</span>
            <span class="detail-value">${info.umurProduk} hari</span>
          </div>
          <div class="product-detail-row">
            <span class="detail-label">Sisa Hari</span>
            <span class="detail-value ${info.sisaHari === 0 ? "color:var(--expired)" : ""}">${
              info.sisaHari > 0 ? info.sisaHari + " hari" : "Kadaluarsa"
            }</span>
          </div>
          <div class="freshness-bar-wrap">
            <div class="freshness-bar-bg">
              <div class="freshness-bar-fill ${statusClass}"
                   style="width: ${info.barWidth}%"></div>
            </div>
          </div>
          <div class="product-actions">
            <button class="btn btn-secondary btn-sm"
                    data-action="marker" data-id="${product.markerId}">
              🏷️ Marker
            </button>
            <button class="btn btn-secondary btn-sm"
                    data-action="edit" data-id="${product.markerId}">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm"
                    data-action="delete" data-id="${product.markerId}"
                    data-name="${escapeHtml(product.namaProduk)}">
              🗑️ Hapus
            </button>
          </div>
        </div>
      </div>`;
  }

  // ─── Event Handlers ───────────────────────────────────────────

  function handleCardAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "delete") {
      pendingDeleteId = id;
      deleteModalName.textContent = btn.dataset.name;
      deleteModal.classList.add("active");
    }

    if (action === "edit") {
      window.location.href = `add-product.html?edit=${id}`;
    }

    if (action === "marker") {
      openMarkerModal(id);
    }
  }

  // Delete modal
  btnConfirmDel.addEventListener("click", () => {
    if (!pendingDeleteId) return;
    Storage.delete(pendingDeleteId);
    deleteModal.classList.remove("active");
    pendingDeleteId = null;
    renderDashboard();
    showToast("Produk dihapus", "success");
  });

  btnCancelDel.addEventListener("click", () => {
    deleteModal.classList.remove("active");
    pendingDeleteId = null;
  });

  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) {
      deleteModal.classList.remove("active");
      pendingDeleteId = null;
    }
  });

  // ─── Marker Modal ─────────────────────────────────────────────

  function openMarkerModal(markerId) {
    const product = Storage.getById(markerId);
    if (!product) return;

    markerIdDisplay.textContent = markerId;
    markerNameDisp.textContent = product.namaProduk;
    activeMarkerId = markerId;

    Marker.generate(markerId, markerCanvas);
    activeMarkerCanvas = markerCanvas;

    markerModal.classList.add("active");
  }

  btnDownMarker.addEventListener("click", () => {
    if (activeMarkerCanvas && activeMarkerId) {
      Marker.download(activeMarkerCanvas, activeMarkerId);
      showToast("Marker diunduh!", "success");
    }
  });

  btnCloseMarker.addEventListener("click", () => {
    markerModal.classList.remove("active");
  });

  markerModal.addEventListener("click", (e) => {
    if (e.target === markerModal) markerModal.classList.remove("active");
  });

  // ─── Utilities ────────────────────────────────────────────────

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Expose renderDashboard for use after edit/add redirect
  window.renderDashboard = renderDashboard;
});
