// Tahap 1: hanya assignment markerId (M001, M002, ...).
// Generate pattern fisik (.patt) untuk AR.js dilakukan via official
// Marker Training Tool, lalu file disimpan ke assets/markers/.
// Loader pattern dinamis ke scanner diimplementasikan di Tahap 3.

function nextMarkerId(products) {
  const used = products
    .map((p) => p.markerId)
    .filter(Boolean)
    .map((id) => parseInt(id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = used.length ? Math.max(...used) + 1 : 1;
  return "M" + String(next).padStart(3, "0");
}

function generateMarkerForProduct(productId) {
  const products = ProductStorage.getProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) return null;

  if (!product.markerId) {
    product.markerId = nextMarkerId(products);
    ProductStorage.saveProducts(products);
  }
  return product;
}

window.MarkerEngine = {generateMarkerForProduct, nextMarkerId};
