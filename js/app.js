document.addEventListener("DOMContentLoaded", () => {
  renderTable();
  startClock();

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("markerModal").hidden = true;
  });
});

function renderTable() {
  const products = ProductStorage.getProducts();
  const tbody = document.getElementById("productTableBody");
  const emptyState = document.getElementById("emptyState");
  const countBadge = document.getElementById("productCount");

  countBadge.textContent = `${products.length} ITEMS`;
  tbody.innerHTML = "";

  if (products.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  products.forEach((product) => {
    const result = ExpiryEngine.calculateStatus(product);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${product.markerId || "—"}</td>
      <td>${escapeHtml(product.namaProduk)}</td>
      <td>${product.tanggalPembelian}</td>
      <td>${product.masaSimpan} HARI</td>
      <td><span class="badge badge-${result.status.toLowerCase()}">${result.label}</span></td>
      <td>${result.sisaHari} HARI</td>
      <td class="actions-cell">
        <a href="add-product.html?id=${product.id}" class="btn-mini">EDIT</a>
        <button class="btn-mini" data-action="marker" data-id="${product.id}">MARKER</button>
        <button class="btn-mini btn-mini-danger" data-action="delete" data-id="${product.id}">DEL</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => onDelete(btn.dataset.id));
  });
  tbody.querySelectorAll('[data-action="marker"]').forEach((btn) => {
    btn.addEventListener("click", () => onGenerateMarker(btn.dataset.id));
  });
}

function onDelete(id) {
  const product = ProductStorage.getProductById(id);
  if (!product) return;
  if (!confirm(`Hapus produk "${product.namaProduk}"?`)) return;
  ProductStorage.deleteProduct(id);
  renderTable();
}

function onGenerateMarker(id) {
  const product = MarkerEngine.generateMarkerForProduct(id);
  if (!product) return;
  showMarkerModal(product);
  renderTable();
}

function showMarkerModal(product) {
  const body = document.getElementById("markerModalBody");
  body.innerHTML = `
    <p>MARKER_ID: <strong>${product.markerId}</strong></p>
    <p>PRODUK: ${escapeHtml(product.namaProduk)}</p>
    <hr style="border-color:#2a2f26;margin:10px 0;">
    <p>Pattern fisik belum digenerate.</p>
    <p>Langkah manual sebelum Tahap 3:</p>
    <ol style="margin:8px 0 8px 18px;">
      <li>Buka AR.js Marker Training Tool.</li>
      <li>Buat pattern dengan label "${product.markerId}".</li>
      <li>Simpan sebagai <code>assets/markers/${product.markerId}.patt</code>.</li>
      <li>Cetak gambar pattern, tempel ke produk fisik.</li>
    </ol>
    <p class="dim">Loader pattern ke scanner.html akan dibangun di Tahap 3.</p>
  `;
  document.getElementById("markerModal").hidden = false;
}

function startClock() {
  const clockEl = document.getElementById("clock");
  function tick() {
    clockEl.textContent = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
  }
  tick();
  setInterval(tick, 1000);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
